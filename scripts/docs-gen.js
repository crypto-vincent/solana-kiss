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
  html += `<div class="api-entry-pre">${htmlBadge(kind)}<pre class="api-pre"><code>${sigHtml}</code></pre></div>\n`;
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

// ── Signature extraction and highlighting ─────────────────────────────────────

/**
 * Extracts the declaration signature text directly from the TypeScript source file.
 * Strips `export` / `declare` modifiers.  For declarations with a body block the
 * text stops just before the opening `{`.
 * @param {import("typescript").Declaration} decl
 * @param {import("typescript").SourceFile} sf
 * @returns {string} Raw TypeScript signature text (no body).
 */
function getSignatureText(decl, sf) {
  const src = sf.text;
  const start = decl.getStart(sf);
  let endPos;

  if (ts.isVariableStatement(decl)) {
    // const/let/var declaration — may contain an arrow function
    const declarations = decl.declarationList.declarations;
    const singleDecl = declarations.length === 1 ? declarations[0] : null;
    const init = singleDecl && singleDecl.initializer;
    if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
      // For an arrow function, stop at the start of the body and also omit the
      // ` => ` token itself.  Use the equalsGreaterThanToken AST position rather
      // than a regex so we handle whitespace and comments correctly.
      const bodyStart = init.body.getFullStart();
      let endPos = bodyStart;
      if (ts.isArrowFunction(init) && init.equalsGreaterThanToken) {
        // Slice ends just before the `=>` token (trim any trailing whitespace)
        endPos = init.equalsGreaterThanToken.getFullStart();
      }
      const text = src.slice(start, endPos).trimEnd();
      return text.replace(/^(export\s+)?(declare\s+)?/, "").trimStart();
    }
    endPos = decl.end;
  } else if ("body" in decl && decl.body) {
    // Function / method / constructor declarations
    endPos = decl.body.getFullStart();
  } else if (ts.isClassDeclaration(decl)) {
    // Use the TypeScript AST to find the class body start rather than searching
    // for `{` with indexOf, which would misfire on braces in type parameters.
    // `decl.members` is a NodeArray whose `.pos` points at the opening `{`.
    endPos = decl.members.pos;
  } else {
    // Type alias, interface, variable declaration without a body
    endPos = decl.end;
  }

  const text = src.slice(start, endPos).trimEnd();
  return text.replace(/^(export\s+)?(declare\s+)?/, "").trimStart();
}

/**
 * Tokenises a raw TypeScript declaration string into syntax-highlighted HTML.
 * PascalCase identifiers present in `typeRegistry` become clickable `<a>` links;
 * other PascalCase names are coloured as type references.  Keywords and built-in
 * primitive type names get their own colour classes.  String literals and line
 * comments are treated as opaque tokens so their content is never re-coloured.
 * @param {string} rawText - Raw TypeScript source text.
 * @param {Map<string, string>} typeRegistry - Symbol name → absolute page-anchor URL.
 * @returns {string} HTML string.
 */
function linkifyCode(rawText, typeRegistry) {
  const result = [];
  // Sub-patterns matched in precedence order so string contents / comments are
  // captured before individual identifiers inside them can match.
  const STRING_LITERAL   = `(["'\`])(?:[^"'\`\\\\]|\\\\.)*\\1`;
  const LINE_COMMENT     = `\\/\\/[^\\n]*`;
  const TS_KEYWORD       = `\\b(function|const|let|var|type|interface|class|extends|implements|new|async|export|declare|readonly|public|private|protected|static|abstract|typeof|keyof|infer|is|in|of|from|return)\\b`;
  const PRIMITIVE_TYPE   = `\\b(string|number|boolean|bigint|void|never|any|unknown|undefined|null|symbol|object)\\b`;
  const PASCAL_CASE_NAME = `\\b([A-Z][a-zA-Z0-9_]*)\\b`;

  const re = new RegExp(
    [STRING_LITERAL, LINE_COMMENT, TS_KEYWORD, PRIMITIVE_TYPE, PASCAL_CASE_NAME].join("|"),
    "g",
  );

  let lastIndex = 0;
  let match;
  while ((match = re.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      result.push(escapeHtml(rawText.slice(lastIndex, match.index)));
    }

    const [full, , keyword, primitive, typeName] = match;
    const first = full[0];

    if (first === '"' || first === "'" || first === "`") {
      result.push(`<span class="sh-str">${escapeHtml(full)}</span>`);
    } else if (first === "/") {
      result.push(`<span class="sh-comment">${escapeHtml(full)}</span>`);
    } else if (keyword) {
      result.push(`<span class="sh-kw">${escapeHtml(keyword)}</span>`);
    } else if (primitive) {
      result.push(`<span class="sh-prim">${escapeHtml(primitive)}</span>`);
    } else if (typeName) {
      const url = typeRegistry.get(typeName);
      if (url) {
        result.push(`<a href="${escapeHtml(url)}" class="sh-type-link">${escapeHtml(typeName)}</a>`);
      } else {
        result.push(`<span class="sh-type">${escapeHtml(typeName)}</span>`);
      }
    } else {
      result.push(escapeHtml(full));
    }
    lastIndex = match.index + full.length;
  }
  if (lastIndex < rawText.length) {
    result.push(escapeHtml(rawText.slice(lastIndex)));
  }
  return result.join("");
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
      const rawSig = d ? getSignatureText(d, sf) : `type ${name}`;
      types.push({ name, rawSig, desc: docOf(exp) });

    } else if (flags & ts.SymbolFlags.Interface) {
      const d = decls.find((d) => ts.isInterfaceDeclaration(d));
      const rawSig = d ? getSignatureText(d, sf) : `interface ${name}`;
      interfaces.push({ name, rawSig, desc: docOf(exp) });

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
          const rawSig = getSignatureText(m, sf);
          methods.push({ name: mName, rawSig, desc: docOfNode(m), jsdoc: tagsOfNode(m) });
        }
      }
      const classRawSig = d ? getSignatureText(d, sf) : `class ${name}`;
      classes.push({ name, rawSig: classRawSig, desc: docOf(exp), methods });

    } else if (flags & ts.SymbolFlags.Function) {
      const d = decls.find((d) => ts.isFunctionDeclaration(d));
      if (d) {
        fns.push({ name, rawSig: getSignatureText(d, sf), desc: docOf(exp), jsdoc: tagsOf(exp) });
      }

    } else if (flags & ts.SymbolFlags.Variable) {
      const d = decls.find((d) => ts.isVariableDeclaration(d));
      const init = d && d.initializer;
      if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
        // Arrow-function variable: get the VariableStatement for the full `const name = ...` text
        const varStmt = d.parent && d.parent.parent;
        const rawSig = (varStmt && ts.isVariableStatement(varStmt))
          ? getSignatureText(varStmt, sf)
          : `function ${name}(...)`;
        fns.push({ name, rawSig, desc: docOf(exp), jsdoc: tagsOf(exp) });
      } else {
        // Regular constant — use the VariableStatement for `const name: Type = value`
        const varStmt = d && d.parent && d.parent.parent;
        const rawSig = (varStmt && ts.isVariableStatement(varStmt))
          ? getSignatureText(varStmt, sf)
          : `const ${name}`;
        consts.push({ name, rawSig, desc: docOf(exp) });
      }
    }
  }

  return { relPath, fns, types, consts, classes, interfaces };
}

// ── Generate markdown for a module ───────────────────────────────────────────

function generateMarkdown(mod, typeRegistry) {
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
    details += htmlDetailEntry(`class-${cls.name}`, "class", linkifyCode(cls.rawSig, typeRegistry), cls.desc, []);
    for (const m of cls.methods) {
      const isCtor = m.name.startsWith("new ");
      const badge  = isCtor ? "new" : "fn";
      const id     = isCtor ? `fn-${cls.name}-constructor` : `fn-${cls.name}-${m.name}`;
      details += htmlDetailEntry(id, badge, linkifyCode(m.rawSig, typeRegistry), m.desc, m.jsdoc.params);
    }
  }

  for (const fn of mod.fns) {
    details += htmlDetailEntry(`fn-${fn.name}`, "fn", linkifyCode(fn.rawSig, typeRegistry), fn.desc, fn.jsdoc.params);
  }

  for (const t of mod.types) {
    details += htmlDetailEntry(`type-${t.name}`, "type", linkifyCode(t.rawSig, typeRegistry), t.desc, []);
  }

  for (const i of mod.interfaces) {
    details += htmlDetailEntry(`ifc-${i.name}`, "interface", linkifyCode(i.rawSig, typeRegistry), i.desc, []);
  }

  for (const c of mod.consts) {
    details += htmlDetailEntry(`const-${c.name}`, "const", linkifyCode(c.rawSig, typeRegistry), c.desc, []);
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

// ── Pass 1: collect all modules ───────────────────────────────────────────────
/** @type {Array<ReturnType<typeof processFile>>} */
const allMods = [];
for (const sf of program.getSourceFiles()) {
  const mod = processFile(sf);
  if (mod) allMods.push(mod);
}

// ── Build type registry: exported name → page-anchor URL ─────────────────────
/**
 * Maps every exported PascalCase symbol name to its documentation anchor URL.
 * Used by `linkifyCode()` to create clickable links in `<pre>` signature blocks.
 * @type {Map<string, string>}
 */
const typeRegistry = new Map();
for (const mod of allMods) {
  const base = `/api/${mod.relPath}`;
  for (const t of mod.types)      typeRegistry.set(t.name, `${base}#type-${t.name}`);
  for (const i of mod.interfaces) typeRegistry.set(i.name, `${base}#ifc-${i.name}`);
  for (const c of mod.classes)    typeRegistry.set(c.name, `${base}#class-${c.name}`);
  // Include function names too (they may appear as types in callbacks/signatures)
  for (const fn of mod.fns)       typeRegistry.set(fn.name, `${base}#fn-${fn.name}`);
}

// ── Pass 2: generate markdown files ──────────────────────────────────────────
for (const mod of allMods) {
  const md = generateMarkdown(mod, typeRegistry);
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
