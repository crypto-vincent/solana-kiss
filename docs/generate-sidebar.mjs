#!/usr/bin/env node
// Generates docs/_sidebar.md from the TypeDoc markdown output.
import { readdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const apiRoot = "docs/api";

if (!existsSync(apiRoot)) {
  console.error(
    `Error: ${apiRoot} not found. Run 'typedoc' first to generate API docs.`,
  );
  process.exit(1);
}

const lines = [];

lines.push("- [Home](/)");
lines.push("- **API Reference**");

const sections = [
  ["Classes", "classes"],
  ["Functions", "functions"],
  ["Type Aliases", "type-aliases"],
  ["Interfaces", "interfaces"],
  ["Variables", "variables"],
];

for (const [label, folder] of sections) {
  const dir = join(apiRoot, folder);
  if (!existsSync(dir)) continue;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();
  if (files.length === 0) continue;
  lines.push(`  - **${label}**`);
  for (const file of files) {
    const name = file.slice(0, -3);
    lines.push(`    - [${name}](api/${folder}/${file})`);
  }
}

writeFileSync("docs/_sidebar.md", lines.join("\n") + "\n");
console.log(`Generated docs/_sidebar.md (${lines.length} entries)`);
