// @ts-check
/**
 * Custom API documentation generator using the TypeScript compiler API.
 * Produces compact per-module markdown files for VitePress — no TypeDoc.
 *
 * Run: node scripts/docs-gen.js
 */
"use strict";

const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const srcDir = path.resolve(root, "src");
const docsApiDir = path.resolve(root, "docs/api");
const navJsonPath = path.resolve(root, "docs/.vitepress/api-navigation.json");

// ── TypeScript program ────────────────────────────────────────────────────────

const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
if (!configPath) throw new Error("tsconfig.json not found");
const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root, undefined, configPath);

// Only parse source files — skip tests and the index re-export barrel
const srcFiles = parsed.fileNames.filter((f) => {
  const n = f.replace(/\\/g, "/");
  return (
    n.includes("/src/") &&
    !n.endsWith("/src/index.ts") &&
    !n.includes(".test.ts") &&
    !n.includes(".spec.ts")
  );
});
const program = ts.createProgram(srcFiles, Object.assign({}, parsed.options, { noEmit: true, skipLibCheck: true }));
const checker = program.getTypeChecker();

// ── Truncation limits ─────────────────────────────────────────────────────────

/** Max chars for an inline type string (e.g. function parameter or variable type). */
const MAX_TYPE_LEN = 45;
/** Max chars for a type alias definition (slightly longer as it's shown standalone). */
const MAX_TYPE_DEF_LEN = 80;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip `{@link Xxx}` → `` `Xxx` `` and normalise whitespace. */
function cleanDoc(text) {
  return text
    .replace(/\{@link\s+(\w+)\}/g, "`$1`")
    .replace(/\{@link\s+\w+\s+([^}]+)\}/g, "$1")
    .replace(/\n{2,}/g, " ")
    .trim();
}

/** Get JSDoc description for a symbol. */
function docOf(sym) {
  return cleanDoc(ts.displayPartsToString(sym.getDocumentationComment(checker)));
}

/** Get JSDoc description from the leading JSDoc node of an AST member. */
function docOfNode(node) {
  const jsDocNodes = ts.getJSDocCommentsAndTags(node);
  for (const n of jsDocNodes) {
    if (ts.isJSDoc(n) && n.comment) {
      const raw = typeof n.comment === "string" ? n.comment : ts.displayPartsToString(n.comment);
      return cleanDoc(raw);
    }
  }
  return "";
}

/** Get @param tags for a symbol. JSDoc "@param" text may use "-" or "–" as a separator. */
function tagsOf(sym) {
  const params = [];
  let returns = "";
  for (const tag of sym.getJsDocTags(checker)) {
    const text = tag.text ? ts.displayPartsToString(tag.text).trim() : "";
    if (tag.name === "param") {
      // Both ASCII hyphen and Unicode en-dash are valid JSDoc separators
      const m = text.match(/^([\w.[\]]+)\s*[-–]?\s*([\s\S]*)/);
      if (m) params.push({ name: m[1].trim(), desc: cleanDoc(m[2]) });
    } else if (tag.name === "returns" || tag.name === "return") {
      returns = cleanDoc(text);
    }
  }
  return { params, returns };
}

/** Get @param tags from JSDoc tags attached to an AST member (for class methods). */
function tagsOfNode(node) {
  const params = [];
  let returns = "";
  const tags = ts.getJSDocTags(node);
  for (const tag of tags) {
    if (ts.isJSDocParameterTag(tag)) {
      const name = tag.name.getText();
      const raw = tag.comment ? (typeof tag.comment === "string" ? tag.comment : ts.displayPartsToString(tag.comment)) : "";
      params.push({ name, desc: cleanDoc(raw) });
    } else if (ts.isJSDocReturnTag(tag)) {
      const raw = tag.comment ? (typeof tag.comment === "string" ? tag.comment : ts.displayPartsToString(tag.comment)) : "";
      returns = cleanDoc(raw);
    }
  }
  return { params, returns };
}

/** Get text of a TypeScript node, collapsing whitespace. */
function nodeText(node, sf) {
  if (!node) return "";
  return node.getText(sf).replace(/\s+/g, " ").trim();
}

/** Format a parameter declaration compactly (abbreviate complex object types). */
function fmtParam(p, sf) {
  const name = p.name.getText(sf);
  const rest = p.dotDotDotToken ? "..." : "";
  const opt = p.questionToken || p.initializer ? "?" : "";
  if (!p.type) return `${rest}${name}${opt}`;
  const t = nodeText(p.type, sf);
  // Abbreviate long object literal types and complex union types
  const short = t.startsWith("{") ? "{…}" : t.length > MAX_TYPE_LEN ? t.slice(0, MAX_TYPE_LEN - 2) + "…" : t;
  return `${rest}${name}${opt}: ${short}`;
}

/** Extract params and return type from a function/constructor/method declaration. */
function fnSig(decl, sf) {
  const params = Array.from(decl.parameters || []).map((p) => fmtParam(p, sf)).join(", ");
  const ret = decl.type ? nodeText(decl.type, sf) : "";
  return { params, ret };
}

// ── HTML generation helpers ───────────────────────────────────────────────────

/** Escape characters that are special in HTML (safe for both text nodes and attribute values). */
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Returns the first sentence of a description string.
 * Splits on the first sentence-ending punctuation (.!?) followed by whitespace or end-of-string.
 * Falls back to the first line truncated at 120 characters.
 * @param {string} desc - The full description text.
 * @returns {string} The first sentence, or a truncated fallback.
 */
function firstSentence(desc) {
  if (!desc) return "";
  const m = desc.match(/^(.+?[.!?])(?:\s|$)/s);
  return m ? m[1].trim() : desc.replace(/\n[\s\S]*/s, "").trim().slice(0, 120);
}

/** Render a kind badge: fn / type / const / class / interface / new */
function htmlBadge(kind) {
  return `<span class="api-badge api-badge--${kind}">${kind}</span>`;
}

/**
 * Render one row in the compact index.
 * @param {string} kind - badge kind
 * @param {string} id   - anchor target (without #)
 * @param {string} name - display name
 * @param {string} doc  - one-line description
 */
function htmlIndexRow(kind, id, name, doc) {
  return (
    `<a href="#${escapeHtml(id)}" class="api-item">` +
    htmlBadge(kind) +
    `<span class="api-item-name">${escapeHtml(name)}</span>` +
    `<span class="api-item-doc">${escapeHtml(doc)}</span>` +
    `</a>\n`
  );
}

/**
 * Render a named group in the compact index.
 * @param {string}   title - group title (e.g. "Functions")
 * @param {string[]} rows  - pre-built row HTML strings
 */
function htmlIndexGroup(title, rows) {
  if (!rows || rows.length === 0) return "";
  return (
    `<div class="api-group">\n` +
    `<div class="api-group-title">${escapeHtml(title)}</div>\n` +
    `<div class="api-group-items">\n` +
    rows.join("") +
    `</div>\n` +
    `</div>\n`
  );
}

/**
 * Render a detail card entry.
 * @param {string}   id      - the element id (no #)
 * @param {string}   kind    - badge kind
 * @param {string}   sigHtml - pre-built, already-HTML-safe signature markup
 * @param {string}   desc    - full description (will be HTML-escaped)
 * @param {Array<{name:string,desc:string}>} params - @param entries
 */
function htmlDetailEntry(id, kind, sigHtml, desc, params) {
  let html = `<div class="api-entry" id="${escapeHtml(id)}">\n`;
  html += `<div class="api-entry-header">${htmlBadge(kind)}<code class="api-sig">${sigHtml}</code></div>\n`;
  if (desc || (params && params.length > 0)) {
    html += `<div class="api-entry-body">\n`;
    if (desc) html += `<p class="api-entry-doc">${escapeHtml(desc)}</p>\n`;
    if (params && params.length > 0) {
      html += `<dl class="api-params">\n`;
      for (const p of params) {
        html += `<dt><code>${escapeHtml(p.name)}</code></dt><dd>${escapeHtml(p.desc)}</dd>\n`;
      }
      html += `</dl>\n`;
    }
    html += `</div>\n`;
  }
  html += `</div>\n`;
  return html;
}

// ── Syntax-highlighted signature helpers ─────────────────────────────────────

/**
 * Wraps `txt` in a colored `<span>` for signature syntax highlighting.
 * `txt` is HTML-escaped automatically.
 * @param {string} cls - CSS class (e.g. "sig-type")
 * @param {string} txt - Raw text content (will be escaped).
 */
function sp(cls, txt) {
  return `<span class="${cls}">${escapeHtml(txt)}</span>`;
}

/** TypeScript keyword kinds that map to primitive type names. */
const PRIMITIVE_KINDS = new Map([
  [ts.SyntaxKind.StringKeyword,    "string"],
  [ts.SyntaxKind.NumberKeyword,    "number"],
  [ts.SyntaxKind.BooleanKeyword,   "boolean"],
  [ts.SyntaxKind.BigIntKeyword,    "bigint"],
  [ts.SyntaxKind.VoidKeyword,      "void"],
  [ts.SyntaxKind.NeverKeyword,     "never"],
  [ts.SyntaxKind.AnyKeyword,       "any"],
  [ts.SyntaxKind.UnknownKeyword,   "unknown"],
  [ts.SyntaxKind.UndefinedKeyword, "undefined"],
  [ts.SyntaxKind.NullKeyword,      "null"],
  [ts.SyntaxKind.SymbolKeyword,    "symbol"],
  [ts.SyntaxKind.ObjectKeyword,    "object"],
]);

/**
 * Recursively converts a TypeScript type AST node into syntax-highlighted HTML.
 * Handles primitives, type references, unions, intersections, arrays, tuples,
 * object literals, function types, and more.
 * Falls back to plain escaped text for unrecognised node kinds.
 * @param {import("typescript").TypeNode | undefined} node
 * @param {import("typescript").SourceFile} sf
 * @returns {string} HTML string with colored `<span>` elements.
 */
function htmlTypeNode(node, sf) {
  if (!node) return "";
  const k = node.kind;

  // Primitive keywords: string, number, boolean, bigint, void, never, etc.
  const prim = PRIMITIVE_KINDS.get(k);
  if (prim) return sp("sig-primitive", prim);

  // true / false keyword literals
  if (k === ts.SyntaxKind.TrueKeyword)  return sp("sig-primitive", "true");
  if (k === ts.SyntaxKind.FalseKeyword) return sp("sig-primitive", "false");

  // Literal type:  "str" | 42 | true | null
  if (k === ts.SyntaxKind.LiteralType) {
    const lit = node.literal;
    if (lit.kind === ts.SyntaxKind.StringLiteral)
      return sp("sig-str", `"${lit.text}"`);
    if (lit.kind === ts.SyntaxKind.NumericLiteral || lit.kind === ts.SyntaxKind.BigIntLiteral)
      return sp("sig-primitive", lit.text);
    if (lit.kind === ts.SyntaxKind.TrueKeyword)  return sp("sig-primitive", "true");
    if (lit.kind === ts.SyntaxKind.FalseKeyword) return sp("sig-primitive", "false");
    if (lit.kind === ts.SyntaxKind.NullKeyword)  return sp("sig-primitive", "null");
    return escapeHtml(nodeText(node, sf));
  }

  // Type reference:  Pubkey | Array<T> | Record<K,V> | Promise<T>
  if (k === ts.SyntaxKind.TypeReference) {
    const name = node.typeName.getText(sf);
    let html = sp("sig-type", name);
    if (node.typeArguments && node.typeArguments.length > 0) {
      html += sp("sig-punct", "<");
      html += Array.from(node.typeArguments)
        .map((a) => htmlTypeNode(a, sf))
        .join(sp("sig-punct", ", "));
      html += sp("sig-punct", ">");
    }
    return html;
  }

  // Union:  A | B | C
  if (k === ts.SyntaxKind.UnionType) {
    return Array.from(node.types)
      .map((t) => htmlTypeNode(t, sf))
      .join(sp("sig-op", " | "));
  }

  // Intersection:  A & B
  if (k === ts.SyntaxKind.IntersectionType) {
    return Array.from(node.types)
      .map((t) => htmlTypeNode(t, sf))
      .join(sp("sig-op", " & "));
  }

  // Array:  T[]
  if (k === ts.SyntaxKind.ArrayType) {
    return htmlTypeNode(node.elementType, sf) + sp("sig-punct", "[]");
  }

  // Tuple:  [A, B, C]
  if (k === ts.SyntaxKind.TupleType) {
    const elems = Array.from(node.elements).map((e) => {
      // NamedTupleMember (TS 4.0+):  label: Type  or  ...label: Type
      if (e.kind === ts.SyntaxKind.NamedTupleMember) {
        const rest = e.dotDotDotToken ? sp("sig-punct", "...") : "";
        return rest + sp("sig-param", e.name.getText(sf)) + sp("sig-punct", ": ") + htmlTypeNode(e.type, sf);
      }
      return htmlTypeNode(e, sf);
    });
    return sp("sig-punct", "[") + elems.join(sp("sig-punct", ", ")) + sp("sig-punct", "]");
  }

  // Parenthesized:  (T)
  if (k === ts.SyntaxKind.ParenthesizedType) {
    return sp("sig-punct", "(") + htmlTypeNode(node.type, sf) + sp("sig-punct", ")");
  }

  // Object literal type:  { key: Type; ... }
  if (k === ts.SyntaxKind.TypeLiteral) {
    const members = Array.from(node.members || []);
    if (members.length === 0) return sp("sig-punct", "{}");
    const parts = members.slice(0, 4).map((m) => {
      if (ts.isPropertySignature(m)) {
        const opt = m.questionToken ? sp("sig-punct", "?") : "";
        const typeHtml = m.type ? sp("sig-punct", ": ") + htmlTypeNode(m.type, sf) : "";
        return sp("sig-param", m.name.getText(sf)) + opt + typeHtml;
      }
      if (ts.isIndexSignatureDeclaration(m)) return sp("sig-punct", "[…]");
      return sp("sig-punct", "…");
    });
    const suffix = members.length > 4 ? sp("sig-punct", "; …") : "";
    return (
      sp("sig-punct", "{ ") +
      parts.join(sp("sig-punct", "; ")) +
      suffix +
      sp("sig-punct", " }")
    );
  }

  // Function type:  (params) => RetType
  if (k === ts.SyntaxKind.FunctionType) {
    const paramHtmls = Array.from(node.parameters || []).map((p) => htmlParamNode(p, sf));
    const ret = node.type ? htmlTypeNode(node.type, sf) : sp("sig-primitive", "void");
    return (
      sp("sig-punct", "(") +
      paramHtmls.join(sp("sig-punct", ", ")) +
      sp("sig-punct", ")") +
      sp("sig-op", " => ") +
      ret
    );
  }

  // Indexed access:  T[K]
  if (k === ts.SyntaxKind.IndexedAccessType) {
    return (
      htmlTypeNode(node.objectType, sf) +
      sp("sig-punct", "[") +
      htmlTypeNode(node.indexType, sf) +
      sp("sig-punct", "]")
    );
  }

  // Type predicate:  value is Type
  if (k === ts.SyntaxKind.TypePredicate) {
    const paramName = node.parameterName.getText(sf);
    const typeHtml = node.type ? sp("sig-kw", " is ") + htmlTypeNode(node.type, sf) : "";
    return sp("sig-param", paramName) + typeHtml;
  }

  // Rest type in tuple:  ...T
  if (k === ts.SyntaxKind.RestType) {
    return sp("sig-punct", "...") + htmlTypeNode(node.type, sf);
  }

  // Optional type in tuple:  T?
  if (k === ts.SyntaxKind.OptionalType) {
    return htmlTypeNode(node.type, sf) + sp("sig-punct", "?");
  }

  // Template literal type:  `prefix${T}`
  if (k === ts.SyntaxKind.TemplateLiteralType) {
    return sp("sig-str", nodeText(node, sf));
  }

  // Conditional / Mapped types — show abbreviated (too complex for inline)
  if (k === ts.SyntaxKind.ConditionalType || k === ts.SyntaxKind.MappedType) {
    return sp("sig-type", "…");
  }

  // Fallback: plain escaped text
  return escapeHtml(nodeText(node, sf));
}

/**
 * Renders a single function parameter declaration as syntax-highlighted HTML.
 * @param {import("typescript").ParameterDeclaration} p
 * @param {import("typescript").SourceFile} sf
 * @returns {string}
 */
function htmlParamNode(p, sf) {
  const rest     = p.dotDotDotToken ? sp("sig-punct", "...") : "";
  const name     = p.name.getText(sf);
  const opt      = (p.questionToken || p.initializer) ? sp("sig-punct", "?") : "";
  const typeHtml = p.type ? sp("sig-punct", ": ") + htmlTypeNode(p.type, sf) : "";
  return rest + sp("sig-param", name) + opt + typeHtml;
}

/**
 * Builds a full syntax-highlighted HTML signature for a function, method, or constructor.
 * @param {string} displayName - The name shown before `(` (e.g. "pubkeyFromBase58" or "new Solana").
 * @param {import("typescript").FunctionDeclaration|import("typescript").MethodDeclaration|import("typescript").ConstructorDeclaration|import("typescript").ArrowFunction} decl
 * @param {import("typescript").SourceFile} sf
 * @param {boolean} isCtor - Pass `true` for constructors (suppresses return type).
 * @returns {string} HTML string.
 */
function htmlFnSig(displayName, decl, sf, isCtor) {
  const paramHtmls = Array.from(decl.parameters || []).map((p) => htmlParamNode(p, sf));

  const nameHtml = isCtor
    ? sp("sig-kw", "new") + " " + sp("sig-fn-name", displayName)
    : sp("sig-fn-name", displayName);

  const retHtml = (!isCtor && decl.type)
    ? " " + sp("sig-op", "→") + " " + htmlTypeNode(decl.type, sf)
    : "";

  return (
    nameHtml +
    sp("sig-punct", "(") +
    paramHtmls.join(sp("sig-punct", ", ")) +
    sp("sig-punct", ")") +
    retHtml
  );
}

// ── Generate HTML page for a module ──────────────────────────────────────────

// ── Process a single source file ──────────────────────────────────────────────

function processFile(sf) {
  if (sf.isDeclarationFile) return null;
  const norm = sf.fileName.replace(/\\/g, "/");
  if (!norm.includes("/src/") || norm.endsWith("/src/index.ts")) return null;

  const modSym = checker.getSymbolAtLocation(sf);
  if (!modSym) return null;

  const exports = checker.getExportsOfModule(modSym);
  if (exports.length === 0) return null;

  const relPath = path.relative(srcDir, sf.fileName).replace(/\.ts$/, "").replace(/\\/g, "/");

  const fns = [];
  const types = [];
  const consts = [];
  const classes = [];
  const interfaces = [];

  for (const exp of exports) {
    const name = exp.getName();
    const flags = exp.getFlags();
    const decls = exp.getDeclarations() || [];

    if (flags & ts.SymbolFlags.TypeAlias) {
      const d = decls.find((d) => ts.isTypeAliasDeclaration(d));
      const typeText = d ? nodeText(d.type, sf) : "";
      // Abbreviate very long type texts
      const typeShort = typeText.length > MAX_TYPE_DEF_LEN ? typeText.slice(0, MAX_TYPE_DEF_LEN - 2) + "…" : typeText;
      const sigHtml = d && d.type
        ? sp("sig-type", name) + " " + sp("sig-punct", "=") + " " + htmlTypeNode(d.type, sf)
        : sp("sig-type", name);
      types.push({ name, typeText: typeShort, sigHtml, desc: docOf(exp) });

    } else if (flags & ts.SymbolFlags.Interface) {
      interfaces.push({ name, sigHtml: sp("sig-kw", "interface") + " " + sp("sig-type", name), desc: docOf(exp) });

    } else if (flags & ts.SymbolFlags.Class) {
      const d = decls.find((d) => ts.isClassDeclaration(d));
      const methods = [];
      if (d) {
        for (const m of d.members) {
          const isCtor = ts.isConstructorDeclaration(m);
          const isMethod = ts.isMethodDeclaration(m);
          if (!isCtor && !isMethod) continue;
          const mods = Array.from(m.modifiers || []).map((mod) => mod.kind);
          const isHidden = mods.some(
            (k) => k === ts.SyntaxKind.PrivateKeyword || k === ts.SyntaxKind.ProtectedKeyword,
          );
          if (isHidden) continue;
          const mName = isCtor ? `new ${name}` : m.name.getText(sf);
          const mDesc = docOfNode(m);
          const mJsdoc = tagsOfNode(m);
          const { params, ret } = fnSig(m, sf);
          methods.push({ name: mName, params, ret: isCtor ? "" : ret, sigHtml: htmlFnSig(mName, m, sf, isCtor), desc: mDesc, jsdoc: mJsdoc });
        }
      }
      classes.push({ name, sigHtml: sp("sig-kw", "class") + " " + sp("sig-type", name), desc: docOf(exp), methods });

    } else if (flags & ts.SymbolFlags.Function) {
      const d = decls.find((d) => ts.isFunctionDeclaration(d));
      if (d) {
        const { params, ret } = fnSig(d, sf);
        fns.push({ name, params, ret, sigHtml: htmlFnSig(name, d, sf, false), desc: docOf(exp), jsdoc: tagsOf(exp) });
      }

    } else if (flags & ts.SymbolFlags.Variable) {
      const d = decls.find((d) => ts.isVariableDeclaration(d));
      const init = d && d.initializer;
      if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
        const { params, ret } = fnSig(init, sf);
        fns.push({ name, params, ret, sigHtml: htmlFnSig(name, init, sf, false), desc: docOf(exp), jsdoc: tagsOf(exp) });
      } else {
        // Check if the type has call signatures (function type alias variable)
        const type = checker.getTypeOfSymbol(exp);
        const calls = type.getCallSignatures();
        if (calls.length > 0) {
          const sig = calls[0];
          const params = sig.parameters
            .map((p) => {
              const pt = checker.typeToString(checker.getTypeOfSymbol(p));
              const ptShort = pt.startsWith("{") ? "{…}" : pt.length > MAX_TYPE_LEN ? pt.slice(0, MAX_TYPE_LEN - 2) + "…" : pt;
              return `${p.getName()}: ${ptShort}`;
            })
            .join(", ");
          const ret = checker.typeToString(sig.getReturnType());
          // Build a highlighted sigHtml from the checker-resolved parameter types
          const sigParamsHtml = sig.parameters
            .map((p) => {
              const pt = checker.typeToString(checker.getTypeOfSymbol(p));
              const ptShort = pt.startsWith("{") ? "{…}" : pt.length > MAX_TYPE_LEN ? pt.slice(0, MAX_TYPE_LEN - 2) + "…" : pt;
              return sp("sig-param", p.getName()) + sp("sig-punct", ": ") + sp("sig-type", ptShort);
            })
            .join(sp("sig-punct", ", "));
          const sigRetHtml = ret ? " " + sp("sig-op", "→") + " " + sp("sig-type", ret) : "";
          const sigHtml = sp("sig-fn-name", name) + sp("sig-punct", "(") + sigParamsHtml + sp("sig-punct", ")") + sigRetHtml;
          fns.push({ name, params, ret, sigHtml, desc: docOf(exp), jsdoc: tagsOf(exp) });
        } else {
          const typeStr = checker.typeToString(type);
          const typeShort = typeStr.length > MAX_TYPE_LEN ? typeStr.slice(0, MAX_TYPE_LEN - 2) + "…" : typeStr;
          const sigHtml = (d && d.type)
            ? sp("sig-const", name) + sp("sig-punct", ": ") + htmlTypeNode(d.type, sf)
            : sp("sig-const", name) + sp("sig-punct", ": ") + sp("sig-type", typeShort);
          consts.push({ name, typeStr: typeShort, sigHtml, desc: docOf(exp) });
        }
      }
    }
  }

  return { relPath, fns, types, consts, classes, interfaces };
}

// ── Generate markdown for a module ───────────────────────────────────────────

function generateMarkdown(mod) {
  const totalItems =
    mod.fns.length + mod.types.length + mod.consts.length +
    mod.classes.length + mod.interfaces.length;
  if (totalItems === 0) return null;

  const title = mod.relPath.split("/").pop();

  // ── Compact index (docs.rs overview style) ────────────────────────────────
  const clsRows = [];
  const fnRows  = [];
  const typRows = [];
  const ifcRows = [];
  const cstRows = [];

  for (const cls of mod.classes) {
    clsRows.push(htmlIndexRow("class", `class-${cls.name}`, cls.name, firstSentence(cls.desc)));
    for (const m of cls.methods) {
      const isCtor  = m.name.startsWith("new ");
      const badge   = isCtor ? "new" : "fn";
      const id      = isCtor ? `fn-${cls.name}-constructor` : `fn-${cls.name}-${m.name}`;
      const display = isCtor ? `new ${cls.name}` : m.name;
      clsRows.push(htmlIndexRow(badge, id, display, firstSentence(m.desc)));
    }
  }
  for (const fn of mod.fns) {
    fnRows.push(htmlIndexRow("fn", `fn-${fn.name}`, fn.name, firstSentence(fn.desc)));
  }
  for (const t of mod.types) {
    typRows.push(htmlIndexRow("type", `type-${t.name}`, t.name, firstSentence(t.desc)));
  }
  for (const i of mod.interfaces) {
    ifcRows.push(htmlIndexRow("interface", `ifc-${i.name}`, i.name, firstSentence(i.desc)));
  }
  for (const c of mod.consts) {
    cstRows.push(htmlIndexRow("const", `const-${c.name}`, c.name, firstSentence(c.desc)));
  }

  let overview = `<div class="api-overview">\n`;
  overview += htmlIndexGroup("Classes",     clsRows);
  overview += htmlIndexGroup("Functions",   fnRows);
  overview += htmlIndexGroup("Type Aliases", typRows);
  overview += htmlIndexGroup("Interfaces",  ifcRows);
  overview += htmlIndexGroup("Constants",   cstRows);
  overview += `</div>\n`;

  // ── Detail cards (docs.rs item style) ────────────────────────────────────
  let details = `<div class="api-entries">\n`;

  for (const cls of mod.classes) {
    // Class overview card
    details += htmlDetailEntry(`class-${cls.name}`, "class", cls.sigHtml, cls.desc, []);
    // Constructor and public methods
    for (const m of cls.methods) {
      const isCtor = m.name.startsWith("new ");
      const badge  = isCtor ? "new" : "fn";
      const id     = isCtor ? `fn-${cls.name}-constructor` : `fn-${cls.name}-${m.name}`;
      details += htmlDetailEntry(id, badge, m.sigHtml, m.desc, m.jsdoc.params);
    }
  }

  for (const fn of mod.fns) {
    // Use prebuilt highlighted HTML; fall back to a minimally coloured plain sig
    const sigHtml = fn.sigHtml ?? (
      sp("sig-fn-name", fn.name) +
      sp("sig-punct", "(") +
      escapeHtml(fn.params) +
      sp("sig-punct", ")") +
      (fn.ret ? " " + sp("sig-op", "→") + " " + escapeHtml(fn.ret) : "")
    );
    details += htmlDetailEntry(`fn-${fn.name}`, "fn", sigHtml, fn.desc, fn.jsdoc.params);
  }

  for (const t of mod.types) {
    details += htmlDetailEntry(`type-${t.name}`, "type", t.sigHtml, t.desc, []);
  }

  for (const i of mod.interfaces) {
    details += htmlDetailEntry(`ifc-${i.name}`, "interface", i.sigHtml, i.desc, []);
  }

  for (const c of mod.consts) {
    details += htmlDetailEntry(`const-${c.name}`, "const", c.sigHtml, c.desc, []);
  }

  details += `</div>\n`;

  return `# ${title}\n\n${overview}\n<hr class="api-sep">\n\n${details}`;
}

// ── Main: iterate all source files ───────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Clean the output directory
if (fs.existsSync(docsApiDir)) {
  fs.rmSync(docsApiDir, { recursive: true });
}
ensureDir(docsApiDir);

/** @type {Record<string, Array<{title:string,kind:number,path:string,isDeprecated:boolean}>>} */
const navByGroup = {};
let fileCount = 0;

for (const sf of program.getSourceFiles()) {
  const mod = processFile(sf);
  if (!mod) continue;

  const md = generateMarkdown(mod);
  if (!md) continue;

  const outFile = path.join(docsApiDir, mod.relPath + ".md");
  ensureDir(path.dirname(outFile));
  fs.writeFileSync(outFile, md, "utf-8");
  fileCount++;

  const parts = mod.relPath.split("/");
  const group = parts.length > 1 ? parts[0] : "__root__";
  const title = parts[parts.length - 1];
  if (!navByGroup[group]) navByGroup[group] = [];
  navByGroup[group].push({ title, kind: 2, path: mod.relPath + ".md", isDeprecated: false });
}

// Build sidebar navigation JSON
const navEntries = [];
const groups = Object.keys(navByGroup)
  .filter((k) => k !== "__root__")
  .sort();
for (const group of groups) {
  const children = navByGroup[group].slice().sort((a, b) => a.title.localeCompare(b.title));
  navEntries.push({ title: group, children });
}
// Root-level entries (e.g., Solana.ts) at end
if (navByGroup["__root__"]) {
  navEntries.push(...navByGroup["__root__"].sort((a, b) => a.title.localeCompare(b.title)));
}

ensureDir(path.dirname(navJsonPath));
fs.writeFileSync(navJsonPath, JSON.stringify(navEntries, null, 2), "utf-8");
console.log(`Generated ${fileCount} API pages → docs/api/`);
console.log(`Navigation JSON → docs/.vitepress/api-navigation.json`);
