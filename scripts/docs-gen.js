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

// ── Markdown builders ─────────────────────────────────────────────────────────

/** Render a function/method entry compactly. */
function mdFn(name, params, ret, desc, jsdoc) {
  const retStr = ret ? ` → \`${ret}\`` : "";
  const lines = [`### \`${name}(${params})\`${retStr}`];
  if (desc) lines.push("", desc);
  if (jsdoc.params.length > 0) {
    lines.push("");
    for (const p of jsdoc.params) {
      lines.push(`- **\`${p.name}\`** — ${p.desc}`);
    }
  }
  return lines.join("\n");
}

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
      types.push({ name, typeText: typeShort, desc: docOf(exp) });

    } else if (flags & ts.SymbolFlags.Interface) {
      interfaces.push({ name, desc: docOf(exp) });

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
          methods.push({ name: mName, params, ret: isCtor ? "" : ret, desc: mDesc, jsdoc: mJsdoc });
        }
      }
      classes.push({ name, desc: docOf(exp), methods });

    } else if (flags & ts.SymbolFlags.Function) {
      const d = decls.find((d) => ts.isFunctionDeclaration(d));
      if (d) {
        const { params, ret } = fnSig(d, sf);
        fns.push({ name, params, ret, desc: docOf(exp), jsdoc: tagsOf(exp) });
      }

    } else if (flags & ts.SymbolFlags.Variable) {
      const d = decls.find((d) => ts.isVariableDeclaration(d));
      const init = d && d.initializer;
      if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
        const { params, ret } = fnSig(init, sf);
        fns.push({ name, params, ret, desc: docOf(exp), jsdoc: tagsOf(exp) });
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
          fns.push({ name, params, ret, desc: docOf(exp), jsdoc: tagsOf(exp) });
        } else {
          const typeStr = checker.typeToString(type);
          const typeShort = typeStr.length > MAX_TYPE_LEN ? typeStr.slice(0, MAX_TYPE_LEN - 2) + "…" : typeStr;
          consts.push({ name, typeStr: typeShort, desc: docOf(exp) });
        }
      }
    }
  }

  return { relPath, fns, types, consts, classes, interfaces };
}

// ── Generate markdown for a module ───────────────────────────────────────────

function generateMarkdown(mod) {
  const title = mod.relPath.split("/").pop();
  const lines = [`# ${title}`, ""];

  // Classes (usually 0 or 1 per file)
  for (const cls of mod.classes) {
    if (cls.desc) lines.push(cls.desc, "");

    const ctor = cls.methods.find((m) => m.name.startsWith("new "));
    if (ctor) {
      lines.push("## Constructor", "");
      lines.push(mdFn(ctor.name, ctor.params, "", ctor.desc, ctor.jsdoc), "");
    }

    const methods = cls.methods.filter((m) => !m.name.startsWith("new "));
    if (methods.length > 0) {
      lines.push("## Methods", "");
      for (const m of methods) {
        lines.push(mdFn(m.name, m.params, m.ret, m.desc, m.jsdoc), "");
      }
    }
  }

  // Functions
  if (mod.fns.length > 0) {
    lines.push("## Functions", "");
    for (const fn of mod.fns) {
      lines.push(mdFn(fn.name, fn.params, fn.ret, fn.desc, fn.jsdoc), "");
    }
  }

  // Types
  if (mod.types.length > 0) {
    lines.push("## Types", "");
    for (const t of mod.types) {
      if (t.typeText) {
        lines.push(`**\`${t.name}\`** = \`${t.typeText}\``);
      } else {
        lines.push(`**\`${t.name}\`**`);
      }
      if (t.desc) lines.push(t.desc);
      lines.push("");
    }
  }

  // Interfaces
  if (mod.interfaces.length > 0) {
    lines.push("## Interfaces", "");
    for (const i of mod.interfaces) {
      lines.push(`**\`${i.name}\`**`);
      if (i.desc) lines.push(i.desc);
      lines.push("");
    }
  }

  // Constants
  if (mod.consts.length > 0) {
    lines.push("## Constants", "");
    for (const c of mod.consts) {
      lines.push(`**\`${c.name}\`**: \`${c.typeStr}\``);
      if (c.desc) lines.push(c.desc);
      lines.push("");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
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
  // Skip files with only a title (no real content)
  if (md.split("\n").filter((l) => l.trim()).length <= 1) continue;

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
