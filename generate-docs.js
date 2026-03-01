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

/**
 * Within an already-HTML-escaped definition string, wrap every occurrence of a
 * known symbol name (word-boundary matched) with an anchor link.
 * We skip replacement inside existing anchor tags to avoid double-wrapping.
 */
function linkSymbols(escapedText, allNames) {
  if (allNames.size === 0) return escapedText;

  // Sort longest-first so "RpcHttpGetBlock" is matched before "RpcHttp"
  const sorted = [...allNames].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${sorted.map(escapeRegex).join("|")})\\b`, "g");

  // We do a simple pass over the string, skipping content inside <a ...>...</a>
  let result = "";
  let pos = 0;
  const anchorOpen = /<a\s/gi;
  const anchorClose = /<\/a>/gi;

  // Reset lastIndex
  anchorOpen.lastIndex = 0;
  anchorClose.lastIndex = 0;

  // Collect <a> ranges to skip
  const skipRanges = [];
  {
    const tmp = escapedText;
    let m;
    anchorOpen.lastIndex = 0;
    while ((m = anchorOpen.exec(tmp)) !== null) {
      const start = m.index;
      anchorClose.lastIndex = start;
      const m2 = anchorClose.exec(tmp);
      if (m2) {
        skipRanges.push([start, m2.index + m2[0].length]);
      }
    }
  }

  function inSkipRange(index) {
    for (const [s, e] of skipRanges) {
      if (index >= s && index < e) return true;
    }
    return false;
  }

  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(escapedText)) !== null) {
    if (inSkipRange(match.index)) continue;
    result += escapedText.slice(pos, match.index);
    result += `<a href="#${match[1]}">${match[1]}</a>`;
    pos = match.index + match[0].length;
  }
  result += escapedText.slice(pos);
  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

function generateHtml(modules, allNames) {
  const pkgPath = path.join(__dirname, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const version = pkg.version || "";
  const pkgName = pkg.name || "solana-kiss";

  // ---- Sidebar tree ----
  let sidebarHtml = "";
  for (const mod of modules) {
    sidebarHtml += `<details open><summary class="mod-summary">${escapeHtml(mod.path)}</summary><ul>`;
    for (const sym of mod.symbols) {
      sidebarHtml += `<li><a href="#${escapeHtml(sym.name)}" class="kind-${escapeHtml(sym.kind.split(" ")[0])}">${escapeHtml(sym.name)}</a></li>`;
    }
    sidebarHtml += `</ul></details>`;
  }

  // ---- Main content ----
  let mainHtml = "";
  for (const mod of modules) {
    mainHtml += `<section class="module-section">`;
    mainHtml += `<h2 class="module-heading">${escapeHtml(mod.path)}</h2>`;
    for (const sym of mod.symbols) {
      const escapedDef = escapeHtml(sym.definition);
      const linkedDef = linkSymbols(escapedDef, allNames);
      mainHtml += `<div class="symbol" id="${escapeHtml(sym.name)}">`;
      mainHtml += `<div class="symbol-header"><span class="kind kind-${escapeHtml(sym.kind.split(" ")[0])}">${escapeHtml(sym.kind)}</span> <span class="symbol-name">${escapeHtml(sym.name)}</span></div>`;
      mainHtml += `<pre>${linkedDef}</pre>`;
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
    #sidebar details { padding: 0; }
    #sidebar details + details { border-top: 1px solid var(--border); }
    .mod-summary {
      cursor: pointer;
      padding: 6px 16px;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .05em;
      list-style: none;
      user-select: none;
    }
    .mod-summary:hover { color: var(--text); }
    .mod-summary::marker, .mod-summary::-webkit-details-marker { display: none; }
    details[open] .mod-summary::before { content: "▾ "; }
    details:not([open]) .mod-summary::before { content: "▸ "; }
    #sidebar ul { list-style: none; padding: 2px 0 6px 0; }
    #sidebar ul li a {
      display: block;
      padding: 2px 16px 2px 28px;
      color: var(--text);
      text-decoration: none;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.82rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
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
    .kind-type    { color: var(--kind-type); }
    .kind-interface { color: var(--kind-interface); }
    .kind-class   { color: var(--kind-class); }
    .kind-function { color: var(--kind-function); }
    .kind-const   { color: var(--kind-const); }
    .kind-enum    { color: var(--kind-enum); }
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
    pre a {
      color: var(--accent);
      text-decoration: none;
    }
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
