#!/usr/bin/env node
/**
 * generate-docs.js
 *
 * Single-file documentation generator for solana-kiss.
 * No external dependencies – uses only Node.js built-in modules.
 *
 * Usage:  node generate-docs.js
 * Output: docs/index.html
 */
"use strict";

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SRC_DIR = path.join(__dirname, "src");
const OUT_DIR = path.join(__dirname, "docs");
const OUT_FILE = path.join(OUT_DIR, "index.html");

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

/** Recursively collect all .ts source files, excluding index.ts and .d.ts */
function findTsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsFiles(full));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".d.ts") &&
      entry.name !== "index.ts"
    ) {
      results.push(full);
    }
  }
  return results.sort();
}

// ---------------------------------------------------------------------------
// Symbol extraction
// ---------------------------------------------------------------------------

/**
 * Find the line index where the declaration that starts at `startLine` ends.
 * Handles brace-delimited bodies and semicolon-terminated aliases / consts.
 */
function findDefinitionEnd(lines, startLine) {
  let braceDepth = 0;
  let parenDepth = 0;
  let foundBrace = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let k = startLine; k < lines.length; k++) {
    const line = lines[k];
    inLineComment = false;

    for (let ci = 0; ci < line.length; ci++) {
      const ch = line[ci];
      const next = line[ci + 1];

      if (inBlockComment) {
        if (ch === "*" && next === "/") {
          inBlockComment = false;
          ci++; // skip /
        }
        continue;
      }

      if (inLineComment) break; // rest of line is comment

      if (ch === "/" && next === "/") {
        inLineComment = true;
        break;
      }
      if (ch === "/" && next === "*") {
        inBlockComment = true;
        ci++;
        continue;
      }

      if (ch === "{") {
        braceDepth++;
        foundBrace = true;
      } else if (ch === "}") {
        braceDepth--;
      } else if (ch === "(") {
        parenDepth++;
      } else if (ch === ")") {
        parenDepth--;
      }
    }

    // Brace-delimited block closed
    if (foundBrace && braceDepth === 0 && parenDepth === 0) {
      return k;
    }
    // Simple declaration terminated by semicolon before any brace was seen
    if (!foundBrace && parenDepth === 0 && line.trimEnd().endsWith(";")) {
      return k;
    }
    // Hit the next top-level export – stop (shouldn't normally happen)
    if (
      k > startLine &&
      braceDepth === 0 &&
      parenDepth === 0 &&
      /^export\s/.test(line.trim())
    ) {
      return k - 1;
    }
  }
  return lines.length - 1;
}

/** Extract all exported, named symbols from a TypeScript source file. */
function extractSymbols(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const symbols = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Only handle top-level export declarations
    if (!/^export\s/.test(line)) continue;
    // Skip re-exports and barrel exports
    if (/^export\s*\*/.test(line)) continue;
    if (/^export\s*\{/.test(line)) continue;
    if (/^export\s*default/.test(line)) continue;

    const match = line.match(
      /^export\s+((?:abstract\s+)?(?:async\s+)?(?:type|interface|class|function|const|let|var|enum))\s+(\w+)/,
    );
    if (!match) continue;

    const kind = match[1].replace(/\s+/g, " ").trim();
    const name = match[2];

    // Find the preceding JSDoc comment (if any)
    let docStart = i;
    if (i > 0 && lines[i - 1] !== undefined && lines[i - 1].trim() === "*/") {
      let j = i - 1;
      while (j >= 0 && !lines[j].trimStart().startsWith("/**")) j--;
      if (j >= 0) docStart = j;
    }

    const endLine = findDefinitionEnd(lines, i);
    const definition = lines
      .slice(docStart, endLine + 1)
      .join("\n")
      .trim();

    symbols.push({ name, kind, definition });

    // Skip past this definition so we don't re-process lines inside it
    i = endLine;
  }

  return symbols;
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// TypeScript syntax highlighter (zero external dependencies)
// ---------------------------------------------------------------------------

const TS_KEYWORDS = new Set([
  "abstract", "any", "as", "async", "await", "boolean", "break", "case",
  "catch", "class", "const", "constructor", "continue", "declare", "default",
  "delete", "do", "else", "enum", "export", "extends", "false", "finally",
  "for", "from", "function", "get", "if", "implements", "import", "in",
  "infer", "instanceof", "interface", "keyof", "let", "module", "namespace",
  "never", "new", "null", "number", "of", "override", "private", "protected",
  "public", "readonly", "return", "set", "static", "string", "super",
  "switch", "symbol", "this", "throw", "true", "try", "type", "typeof",
  "undefined", "unique", "unknown", "var", "void", "while", "yield",
]);

/**
 * Tokenise raw TypeScript source text and emit syntax-highlighted HTML.
 * Known exported symbols become cross-link <a> elements; no external deps used.
 */
function highlightTs(rawText, allNames) {
  let out = "";
  let i = 0;
  const n = rawText.length;

  while (i < n) {
    const ch = rawText[i];
    const ch2 = rawText[i + 1];

    // Block comment  /* ... */
    if (ch === "/" && ch2 === "*") {
      const end = rawText.indexOf("*/", i + 2);
      const chunk = end === -1 ? rawText.slice(i) : rawText.slice(i, end + 2);
      out += `<span class="hl-comment">${escapeHtml(chunk)}</span>`;
      i = end === -1 ? n : end + 2;
      continue;
    }

    // Line comment  // ...
    if (ch === "/" && ch2 === "/") {
      let end = i;
      while (end < n && rawText[end] !== "\n") end++;
      out += `<span class="hl-comment">${escapeHtml(rawText.slice(i, end))}</span>`;
      i = end;
      continue;
    }

    // Double-quoted string
    if (ch === '"') {
      let j = i + 1;
      while (j < n && rawText[j] !== '"') {
        if (rawText[j] === "\\") j++;
        j++;
      }
      out += `<span class="hl-string">${escapeHtml(rawText.slice(i, j + 1))}</span>`;
      i = j + 1;
      continue;
    }

    // Single-quoted string
    if (ch === "'") {
      let j = i + 1;
      while (j < n && rawText[j] !== "'") {
        if (rawText[j] === "\\") j++;
        j++;
      }
      out += `<span class="hl-string">${escapeHtml(rawText.slice(i, j + 1))}</span>`;
      i = j + 1;
      continue;
    }

    // Template literal
    if (ch === "`") {
      let j = i + 1;
      while (j < n && rawText[j] !== "`") {
        if (rawText[j] === "\\") j++;
        j++;
      }
      out += `<span class="hl-string">${escapeHtml(rawText.slice(i, j + 1))}</span>`;
      i = j + 1;
      continue;
    }

    // Number literal: handle hex (0x), binary (0b), octal (0o), decimal/bigint
    if (ch >= "0" && ch <= "9") {
      let j = i;
      if (ch === "0" && (rawText[j + 1] === "x" || rawText[j + 1] === "X")) {
        j += 2;
        while (j < n && /[0-9a-fA-F_]/.test(rawText[j])) j++;
      } else if (ch === "0" && (rawText[j + 1] === "b" || rawText[j + 1] === "B")) {
        j += 2;
        while (j < n && /[01_]/.test(rawText[j])) j++;
      } else if (ch === "0" && (rawText[j + 1] === "o" || rawText[j + 1] === "O")) {
        j += 2;
        while (j < n && /[0-7_]/.test(rawText[j])) j++;
      } else {
        while (j < n && /[0-9_.]/.test(rawText[j])) j++;
        if (j < n && rawText[j] === "n") j++; // BigInt suffix
      }
      out += `<span class="hl-number">${escapeHtml(rawText.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    // Identifier, keyword, or known symbol
    if (/[a-zA-Z_$]/.test(ch)) {
      let j = i;
      while (j < n && /[a-zA-Z0-9_$]/.test(rawText[j])) j++;
      const word = rawText.slice(i, j);
      if (TS_KEYWORDS.has(word)) {
        out += `<span class="hl-keyword">${escapeHtml(word)}</span>`;
      } else if (allNames.has(word)) {
        out += `<a href="#${escapeHtml(word)}" class="hl-symbol">${escapeHtml(word)}</a>`;
      } else if (word[0] >= "A" && word[0] <= "Z") {
        out += `<span class="hl-type">${escapeHtml(word)}</span>`;
      } else {
        out += escapeHtml(word);
      }
      i = j;
      continue;
    }

    // Any other character
    out += escapeHtml(ch);
    i++;
  }

  return out;
}

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

function generateHtml(modules, allNames) {
  const pkgPath = path.join(__dirname, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const version = pkg.version || "";
  const pkgName = pkg.name || "solana-kiss";

  // ---- Sidebar tree: group modules by top-level directory ----
  /** @type {Map<string, {filename: string, symbols: {name:string,kind:string}[]}[]>} */
  const dirGroups = new Map();
  for (const mod of modules) {
    const slashIdx = mod.path.indexOf("/");
    const dirname = slashIdx === -1 ? "" : mod.path.slice(0, slashIdx);
    const filename = slashIdx === -1 ? mod.path : mod.path.slice(slashIdx + 1);
    if (!dirGroups.has(dirname)) dirGroups.set(dirname, []);
    dirGroups.get(dirname).push({ filename, symbols: mod.symbols });
  }

  let sidebarHtml = "";
  for (const [dirname, files] of dirGroups) {
    const groupLabel = dirname || (files.length > 0 ? files[0].filename : "(root)");
    // Directory-level group: open by default (only 3-4 of these)
    sidebarHtml += `<details class="dir-group" open><summary class="dir-summary">${escapeHtml(groupLabel)}</summary>`;
    for (const file of files) {
      // File-level group: collapsed by default
      const label = dirname ? file.filename : "";
      if (label) {
        sidebarHtml += `<details class="file-group"><summary class="file-summary">${escapeHtml(label)}<span class="sym-count">${file.symbols.length}</span></summary><ul>`;
      } else {
        sidebarHtml += `<ul class="file-flat">`;
      }
      for (const sym of file.symbols) {
        sidebarHtml += `<li><a href="#${escapeHtml(sym.name)}" class="kind-${escapeHtml(sym.kind.split(" ")[0])}">${escapeHtml(sym.name)}</a></li>`;
      }
      if (label) {
        sidebarHtml += `</ul></details>`;
      } else {
        sidebarHtml += `</ul>`;
      }
    }
    sidebarHtml += `</details>`;
  }

  // ---- Main content ----
  let mainHtml = "";
  for (const mod of modules) {
    mainHtml += `<section class="module-section">`;
    mainHtml += `<h2 class="module-heading">${escapeHtml(mod.path)}</h2>`;
    for (const sym of mod.symbols) {
      const highlighted = highlightTs(sym.definition, allNames);
      mainHtml += `<div class="symbol" id="${escapeHtml(sym.name)}">`;
      mainHtml += `<div class="symbol-header"><span class="kind kind-${escapeHtml(sym.kind.split(" ")[0])}">${escapeHtml(sym.kind)}</span> <span class="symbol-name">${escapeHtml(sym.name)}</span></div>`;
      mainHtml += `<pre>${highlighted}</pre>`;
      mainHtml += `</div>`;
    }
    mainHtml += `</section>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(pkgName)} v${escapeHtml(version)} – API Reference</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f1117;
      --sidebar-bg: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --muted: #8b949e;
      --accent: #58a6ff;
      --pre-bg: #161b22;
      --kind-type: #d2a8ff;
      --kind-interface: #79c0ff;
      --kind-class: #ffa657;
      --kind-function: #7ee787;
      --kind-const: #e3b341;
      --kind-enum: #f85149;
      font-size: 14px;
    }
    body {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, monospace;
    }
    /* ---- Sidebar ---- */
    #sidebar {
      width: 280px;
      min-width: 200px;
      flex-shrink: 0;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--border);
      overflow-y: auto;
      padding: 16px 0;
    }
    #sidebar h1 {
      font-size: 1.1rem;
      font-weight: 700;
      padding: 0 16px 12px;
      border-bottom: 1px solid var(--border);
      color: var(--accent);
    }
    #sidebar h1 small {
      font-size: 0.75rem;
      font-weight: 400;
      color: var(--muted);
      margin-left: 6px;
    }
    /* Directory-level group */
    .dir-group { border-top: 1px solid var(--border); }
    .dir-group:first-of-type { border-top: none; }
    .dir-summary {
      cursor: pointer;
      padding: 7px 16px;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text);
      text-transform: uppercase;
      letter-spacing: .07em;
      list-style: none;
      user-select: none;
    }
    .dir-summary:hover { color: var(--accent); }
    .dir-summary::marker, .dir-summary::-webkit-details-marker { display: none; }
    .dir-group[open] > .dir-summary::before { content: "▾ "; color: var(--muted); }
    .dir-group:not([open]) > .dir-summary::before { content: "▸ "; color: var(--muted); }
    /* File-level group */
    .file-group { margin: 0; }
    .file-summary {
      cursor: pointer;
      padding: 3px 16px 3px 28px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--muted);
      list-style: none;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .file-summary:hover { color: var(--text); }
    .file-summary::marker, .file-summary::-webkit-details-marker { display: none; }
    .file-group[open] > .file-summary::before { content: "▾ "; }
    .file-group:not([open]) > .file-summary::before { content: "▸ "; }
    .sym-count {
      font-size: 0.68rem;
      color: var(--muted);
      background: rgba(255,255,255,.06);
      border-radius: 8px;
      padding: 0 5px;
      margin-left: 6px;
    }
    /* Symbol links */
    #sidebar ul { list-style: none; padding: 2px 0 4px 0; }
    #sidebar ul.file-flat { padding-left: 0; }
    #sidebar ul li a {
      display: block;
      padding: 2px 16px 2px 44px;
      color: var(--text);
      text-decoration: none;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.82rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #sidebar ul.file-flat li a { padding-left: 28px; }
    #sidebar ul li a:hover { background: rgba(88,166,255,.08); color: var(--accent); }
    /* ---- Main ---- */
    #main {
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px 64px;
    }
    .module-section { margin-bottom: 48px; }
    .module-heading {
      font-size: 1rem;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .08em;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
    }
    .symbol {
      margin-bottom: 24px;
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }
    .symbol:target { border-color: var(--accent); }
    .symbol-header {
      padding: 6px 12px;
      background: rgba(255,255,255,.03);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .symbol-name {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-weight: 700;
      font-size: 0.95rem;
    }
    .kind {
      font-size: 0.7rem;
      padding: 1px 6px;
      border-radius: 3px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .05em;
      background: rgba(255,255,255,.06);
    }
    .kind-type      { color: var(--kind-type); }
    .kind-interface { color: var(--kind-interface); }
    .kind-class     { color: var(--kind-class); }
    .kind-function  { color: var(--kind-function); }
    .kind-const     { color: var(--kind-const); }
    .kind-enum      { color: var(--kind-enum); }
    pre {
      background: var(--pre-bg);
      padding: 14px 16px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.8rem;
      line-height: 1.6;
      overflow-x: auto;
      tab-size: 2;
      white-space: pre;
    }
    /* Syntax highlighting */
    .hl-keyword { color: #ff7b72; }
    .hl-string  { color: #a5d6ff; }
    .hl-comment { color: #8b949e; font-style: italic; }
    .hl-number  { color: #79c0ff; }
    .hl-type    { color: #ffa657; }
    .hl-symbol  { color: var(--accent); text-decoration: none; }
    .hl-symbol:hover { text-decoration: underline; }
    pre a { color: var(--accent); text-decoration: none; }
    pre a:hover { text-decoration: underline; }
    /* Scrollbar styling */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  </style>
</head>
<body>
  <nav id="sidebar">
    <h1>${escapeHtml(pkgName)}<small>v${escapeHtml(version)}</small></h1>
    ${sidebarHtml}
  </nav>
  <main id="main">
    ${mainHtml}
  </main>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const files = findTsFiles(SRC_DIR);

  /** @type {{ path: string, symbols: {name:string, kind:string, definition:string}[] }[]} */
  const modules = [];
  /** @type {Set<string>} */
  const allNames = new Set();

  for (const file of files) {
    const relPath = path.relative(SRC_DIR, file).replace(/\.ts$/, "");
    const symbols = extractSymbols(file);
    if (symbols.length > 0) {
      modules.push({ path: relPath, symbols });
      for (const sym of symbols) allNames.add(sym.name);
    }
  }

  const html = generateHtml(modules, allNames);

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  fs.writeFileSync(OUT_FILE, html);

  const totalSymbols = modules.reduce((s, m) => s + m.symbols.length, 0);
  console.log(
    `✓ Generated ${OUT_FILE}  (${modules.length} modules, ${totalSymbols} symbols)`,
  );
}

main();
