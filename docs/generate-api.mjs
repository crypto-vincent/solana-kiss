#!/usr/bin/env node
/**
 * Custom API documentation generator for solana-kiss.
 * Uses ts-morph to read TypeScript source and generates
 * clean, Docsify-friendly markdown — no TypeDoc needed.
 *
 * Output layout:
 *   docs/api/index.md          – overview with all exports
 *   docs/api/functions/*.md    – one file per exported function
 *   docs/api/classes/*.md      – one file per exported class
 *   docs/api/types/*.md        – one file per type alias
 *   docs/api/interfaces/*.md   – one file per interface
 *   docs/api/variables/*.md    – one file per constant/variable
 */

import {
  Project,
  TypeFormatFlags,
  Scope,
} from "ts-morph";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join } from "path";

// ─── Setup ─────────────────────────────────────────────────────────────────

const OUT = "docs/api";

if (existsSync(OUT)) rmSync(OUT, { recursive: true });

const mkdir = (p) => mkdirSync(p, { recursive: true });
const write = (p, s) => writeFileSync(p, s, "utf8");

for (const sub of ["functions", "classes", "types", "interfaces", "variables"]) {
  mkdir(join(OUT, sub));
}

const project = new Project({ tsConfigFilePath: "tsconfig.json" });
const indexSrc = project.getSourceFileOrThrow("src/index.ts");

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Extract JSDoc description from a declaration node.
 * Works for both single-line /** text */ and multi-line comments.
 */
function getDesc(node) {
  try {
    const docs = node.getJsDocs?.() ?? [];
    if (!docs.length) return "";
    const doc = docs[docs.length - 1];
    const text = doc.getDescription?.() ?? doc.getComment?.() ?? "";
    if (typeof text === "string") return text.trim();
    return String(text).trim();
  } catch {
    return "";
  }
}

/**
 * Escape pipe characters so they don't break markdown tables.
 */
function esc(s) {
  return String(s).replace(/\|/g, "\\|");
}

/**
 * Get the "as-written" type text for a node, falling back to resolved type.
 * Prefers TypeNode text to avoid huge expanded types.
 */
function typeText(node) {
  try {
    const tn = node.getTypeNode?.()?.getText();
    if (tn) return tn;
    return node
      .getType()
      .getText(
        node,
        TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
          TypeFormatFlags.NoTruncation,
      );
  } catch {
    return "unknown";
  }
}

/**
 * Build a clean, readable TypeScript function signature.
 */
function buildFnSig(fn) {
  const nm = fn.getName?.() ?? "";
  const isAsync = fn.isAsync?.() ?? false;
  const tps = (fn.getTypeParameters?.() ?? []).map((t) => t.getText());
  const tpStr = tps.length ? `<${tps.join(", ")}>` : "";
  const params = fn.getParameters?.() ?? [];
  const paramStrs = params.map((p) => {
    const rest = p.isRestParameter() ? "..." : "";
    const opt = p.isOptional() && !p.isRestParameter() ? "?" : "";
    return `${rest}${p.getName()}${opt}: ${typeText(p)}`;
  });
  const retNode = fn.getReturnTypeNode?.();
  const ret = retNode
    ? retNode.getText()
    : (fn.getReturnType?.()?.getText(fn, TypeFormatFlags.NoTruncation) ?? "void");
  const asyncKw = isAsync ? "async " : "";
  // Multi-line when 3+ params for readability
  const paramStr =
    paramStrs.length >= 3
      ? "\n  " + paramStrs.join(",\n  ") + "\n"
      : paramStrs.join(", ");
  return `${asyncKw}function ${nm}${tpStr}(${paramStr}): ${ret}`;
}

/**
 * Build a readable method signature (no "function" keyword).
 */
function buildMethodSig(m) {
  const nm = m.getName?.() ?? "";
  const isAsync = m.isAsync?.() ?? false;
  const tps = (m.getTypeParameters?.() ?? []).map((t) => t.getText());
  const tpStr = tps.length ? `<${tps.join(", ")}>` : "";
  const params = m.getParameters?.() ?? [];
  const paramStrs = params.map((p) => {
    const opt = p.isOptional() ? "?" : "";
    return `${p.getName()}${opt}: ${typeText(p)}`;
  });
  const retNode = m.getReturnTypeNode?.();
  const ret = retNode
    ? retNode.getText()
    : (m.getReturnType?.()?.getText(m, TypeFormatFlags.NoTruncation) ?? "void");
  const asyncKw = isAsync ? "async " : "";
  const paramStr =
    paramStrs.length >= 3
      ? "\n  " + paramStrs.join(",\n  ") + "\n"
      : paramStrs.join(", ");
  return `${asyncKw}${nm}${tpStr}(${paramStr}): ${ret}`;
}

// ─── Page generators ───────────────────────────────────────────────────────

function functionPage(fn) {
  const nm = fn.getName?.() ?? "unknown";
  const desc = getDesc(fn);
  const params = fn.getParameters?.() ?? [];
  const retNode = fn.getReturnTypeNode?.();
  const ret = retNode
    ? retNode.getText()
    : (fn.getReturnType?.()?.getText(fn, TypeFormatFlags.NoTruncation) ?? "");

  let md = `# \`${nm}()\`\n\n`;
  if (desc) md += `> ${desc}\n\n`;

  md += "```typescript\n" + buildFnSig(fn) + "\n```\n\n";

  if (params.length) {
    md += "## Parameters\n\n";
    md += "| Name | Type |\n| ---- | ---- |\n";
    for (const p of params) {
      const rest = p.isRestParameter() ? "..." : "";
      const opt = p.isOptional() && !p.isRestParameter() ? "?" : "";
      md += `| \`${rest}${p.getName()}${opt}\` | \`${esc(typeText(p))}\` |\n`;
    }
    md += "\n";
  }

  if (ret && ret !== "void" && ret !== "Promise<void>") {
    md += `## Returns\n\n\`${esc(ret)}\`\n`;
  }

  return md;
}

function classPage(cls) {
  const nm = cls.getName?.() ?? "unknown";
  const desc = getDesc(cls);

  let md = `# \`${nm}\`\n\n`;
  if (desc) md += `> ${desc}\n\n`;

  // Constructor
  const ctors = cls.getConstructors?.() ?? [];
  if (ctors.length) {
    const ctor = ctors[0];
    const ctorDesc = getDesc(ctor);
    const ps = (ctor.getParameters?.() ?? []).map(
      (p) => `${p.getName()}: ${typeText(p)}`,
    );
    if (ps.length) {
      md += "## Constructor\n\n";
      if (ctorDesc) md += `> ${ctorDesc}\n\n`;
      const paramStr =
        ps.length >= 3 ? "\n  " + ps.join(",\n  ") + "\n" : ps.join(", ");
      md += "```typescript\nnew " + nm + "(" + paramStr + ")\n```\n\n";
    }
  }

  // Public methods (excluding private/protected)
  const methods = (cls.getMethods?.() ?? []).filter(
    (m) =>
      m.getScope() !== Scope.Private && m.getScope() !== Scope.Protected,
  );

  if (methods.length) {
    md += "## Methods\n\n";
    for (const m of methods) {
      const mDesc = getDesc(m);
      const mParams = m.getParameters?.() ?? [];
      const retNode = m.getReturnTypeNode?.();
      const ret = retNode
        ? retNode.getText()
        : (m.getReturnType?.()?.getText(m, TypeFormatFlags.NoTruncation) ?? "void");

      md += `### \`${m.getName?.() ?? "?"}\`\n\n`;
      if (mDesc) md += `> ${mDesc}\n\n`;
      md += "```typescript\n" + buildMethodSig(m) + "\n```\n\n";

      if (mParams.length) {
        md += "| Name | Type |\n| ---- | ---- |\n";
        for (const p of mParams) {
          const opt = p.isOptional() ? "?" : "";
          md += `| \`${p.getName()}${opt}\` | \`${esc(typeText(p))}\` |\n`;
        }
        md += "\n";
      }

      if (ret && ret !== "void" && ret !== "Promise<void>") {
        md += `**Returns** \`${esc(ret)}\`\n\n`;
      }
    }
  }

  return md;
}

function typeAliasPage(ta) {
  const nm = ta.getName?.() ?? "unknown";
  const desc = getDesc(ta);
  const typeNode = ta.getTypeNode?.()?.getText() ?? "";
  const tps = (ta.getTypeParameters?.() ?? []).map((t) => t.getText());
  const tpStr = tps.length ? `<${tps.join(", ")}>` : "";

  let md = `# \`${nm}\`\n\n`;
  if (desc) md += `> ${desc}\n\n`;
  md += "```typescript\ntype " + nm + tpStr + " = " + typeNode + "\n```\n";
  return md;
}

function interfacePage(iface) {
  const nm = iface.getName?.() ?? "unknown";
  const desc = getDesc(iface);
  const props = iface.getProperties?.() ?? [];
  const methods = iface.getMethods?.() ?? [];
  const indexSigs = iface.getIndexSignatures?.() ?? [];

  let md = `# \`${nm}\`\n\n`;
  if (desc) md += `> ${desc}\n\n`;

  md += "```typescript\ninterface " + nm + " {\n";
  for (const ix of indexSigs) {
    const txt = ix.getText().replace(/;$/, "");
    md += `  ${txt};\n`;
  }
  for (const p of props) {
    const opt = p.hasQuestionToken?.() ? "?" : "";
    const ro = p.isReadonly?.() ? "readonly " : "";
    const tn = typeText(p);
    md += `  ${ro}${p.getName()}${opt}: ${tn};\n`;
  }
  for (const m of methods) {
    const mps = (m.getParameters?.() ?? []).map(
      (p) => `${p.getName()}: ${typeText(p)}`,
    );
    const ret = m.getReturnTypeNode?.()?.getText() ?? "void";
    md += `  ${m.getName()}(${mps.join(", ")}): ${ret};\n`;
  }
  md += "}\n```\n";
  return md;
}

function variablePage(vd) {
  const nm = vd.getName?.() ?? "unknown";
  // JSDoc lives on the VariableStatement parent, not the declaration
  const stmt = vd.getVariableStatement?.();
  const desc = stmt ? getDesc(stmt) : "";
  const typeNode = vd.getTypeNode?.()?.getText();
  const init = vd.getInitializer?.()?.getText() ?? "";
  // Infer type from initialiser if no annotation
  const resolvedType =
    typeNode ??
    vd.getType?.()?.getText(vd, TypeFormatFlags.NoTruncation) ??
    "";

  // Trim long initialisers (e.g. big string literals)
  const displayInit =
    init.length > 60 ? init.substring(0, 57) + "…" : init;
  const displayType = typeNode
    ? `: ${typeNode}`
    : resolvedType && resolvedType !== init
      ? `: ${resolvedType}`
      : "";

  let md = `# \`${nm}\`\n\n`;
  if (desc) md += `> ${desc}\n\n`;
  md +=
    "```typescript\nconst " +
    nm +
    displayType +
    (displayInit ? " = " + displayInit : "") +
    "\n```\n";
  return md;
}

// ─── Collect and generate ──────────────────────────────────────────────────

const generated = {
  functions: [],
  classes: [],
  types: [],
  interfaces: [],
  variables: [],
};

for (const [name, decls] of indexSrc.getExportedDeclarations()) {
  for (const decl of decls) {
    const kind = decl.getKindName();

    if (kind === "FunctionDeclaration") {
      write(join(OUT, "functions", `${name}.md`), functionPage(decl));
      generated.functions.push(name);
      break;
    }
    if (kind === "ClassDeclaration") {
      write(join(OUT, "classes", `${name}.md`), classPage(decl));
      generated.classes.push(name);
      break;
    }
    if (kind === "TypeAliasDeclaration") {
      write(join(OUT, "types", `${name}.md`), typeAliasPage(decl));
      generated.types.push(name);
      break;
    }
    if (kind === "InterfaceDeclaration") {
      write(join(OUT, "interfaces", `${name}.md`), interfacePage(decl));
      generated.interfaces.push(name);
      break;
    }
    if (kind === "VariableDeclaration") {
      write(join(OUT, "variables", `${name}.md`), variablePage(decl));
      generated.variables.push(name);
      break;
    }
  }
}

// ─── Index page ────────────────────────────────────────────────────────────

let idx = "# API Reference\n\n";

const sections = [
  ["Classes", "classes"],
  ["Functions", "functions"],
  ["Type Aliases", "types"],
  ["Interfaces", "interfaces"],
  ["Variables", "variables"],
];

for (const [label, key] of sections) {
  const names = generated[key].sort();
  if (!names.length) continue;
  idx += `## ${label}\n\n`;
  for (const n of names) idx += `- [${n}](api/${key}/${n}.md)\n`;
  idx += "\n";
}

write(join(OUT, "index.md"), idx);

// ─── Summary ───────────────────────────────────────────────────────────────

console.log("Generated docs/api:");
for (const [k, v] of Object.entries(generated)) {
  if (v.length) console.log(`  ${k}: ${v.length}`);
}
const total = Object.values(generated).reduce((s, a) => s + a.length, 0);
console.log(`  total: ${total}`);
