#!/usr/bin/env node
// Documentation and fixture consistency checks. Zero dependencies. Phase 0 spec tooling.
// Usage: node tools/check-docs.mjs

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return [".git", "node_modules", ".next", "coverage"].includes(f) ? [] : statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(root);
const rel = (f) => f.slice(root.length + 1);
let problems = 0;
const bad = (msg) => { problems++; console.log(`PROBLEM ${msg}`); };
const read = (p) => readFileSync(join(root, p), "utf8");

// 1. Relative markdown links resolve.
// Vendored third-party skill docs are not ours to link-check (secret scan below still covers them).
const isVendored = (f) => rel(f).startsWith(".claude/skills/ui-ux-pro-max/");
for (const f of files.filter((f) => f.endsWith(".md") && !isVendored(f))) {
  for (const m of readFileSync(f, "utf8").matchAll(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g)) {
    if (!existsSync(resolve(dirname(f), m[1].split("#")[0]))) bad(`broken link ${rel(f)} -> ${m[1]}`);
  }
}

// 2. Every JSON file parses.
for (const f of files.filter((f) => f.endsWith(".json"))) {
  try { JSON.parse(readFileSync(f, "utf8")); } catch (e) { bad(`invalid JSON ${rel(f)}: ${e.message}`); }
}

// 3. ADR index lists every ADR file with the same status.
const decisions = read("docs/DECISIONS.md");
for (const f of files.filter((f) => /docs\/decisions\/ADR-\d+.*\.md$/.test(f))) {
  const name = f.split("/").pop();
  const status = /\*\*Status:\*\*\s*(\w+)/.exec(readFileSync(f, "utf8"))?.[1];
  const row = decisions.split("\n").find((l) => l.includes(`decisions/${name}`));
  if (!row) bad(`ADR not indexed: ${name}`);
  else if (!row.includes(`| ${status} |`)) bad(`ADR status mismatch ${name}: file says ${status}`);
}

// 4. Secret-like patterns.
const secretRe = /(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|api[_-]?key\s*[:=]\s*['"]?[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{30,})/i;
for (const f of files) if (secretRe.test(readFileSync(f, "utf8"))) bad(`possible secret in ${rel(f)}`);

// 5. Search fixtures: ids, uniqueness, references, documented table matches the data.
const catalog = JSON.parse(read("fixtures/search/fixture-catalog.json"));
const queries = JSON.parse(read("fixtures/search/queries.json")).fixtures;
const variantIds = new Set();
for (const p of catalog.products) {
  if (!p.id.startsWith("fx-")) bad(`fixture product id without fx- prefix: ${p.id}`);
  for (const v of p.variants) {
    if (!v.id.startsWith(`${p.id}:`)) bad(`variant id ${v.id} not under ${p.id}`);
    if (variantIds.has(v.id)) bad(`duplicate variant id ${v.id}`);
    variantIds.add(v.id);
  }
}
const qIds = queries.map((f) => f.id);
if (new Set(qIds).size !== qIds.length) bad("duplicate search fixture ids");
for (const f of queries) for (const r of f.expected.results) {
  if (!catalog.products.some((p) => p.id === r.productId)) bad(`${f.id}: unknown product ${r.productId}`);
  for (const v of r.variantIds ?? []) if (!variantIds.has(v)) bad(`${f.id}: unknown variant ${v}`);
}
const docRows = [...read("docs/SEARCH_FIXTURES.md").matchAll(/^\| (F\d+) \|/gm)].map((m) => m[1]);
if (JSON.stringify(docRows) !== JSON.stringify(qIds)) bad(`SEARCH_FIXTURES.md table (${docRows.length} rows) does not match queries.json (${qIds.length})`);

// 6. Other fixture groups have unique ids.
const pricing = JSON.parse(read("fixtures/pricing/cases.json"));
for (const [group, list] of Object.entries({ records: pricing.records, offers: pricing.offers, carts: pricing.carts, configurator: JSON.parse(read("fixtures/configurator/cases.json")).cases })) {
  const ids = list.map((c) => c.id);
  if (new Set(ids).size !== ids.length) bad(`duplicate ids in ${group}`);
}

// 7. Curation template has unique columns.
const header = read("docs/templates/catalog_curation_template.csv").trim().split(",");
if (new Set(header).size !== header.length) bad("duplicate CSV columns");

// 8. Wording guards: no unsupported licensing claim.
for (const f of files.filter((f) => f.endsWith(".md") && !rel(f).includes("PRODUCT_BLUEPRINT"))) {
  if (/lawful by construction|licensing (is )?resolved/i.test(readFileSync(f, "utf8"))) bad(`unsupported licensing claim in ${rel(f)}`);
}

console.log(`${files.length} files scanned; ${queries.length} search fixtures; csv columns=${header.length}; problems=${problems}`);
process.exit(problems ? 1 : 0);
