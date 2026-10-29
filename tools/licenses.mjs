#!/usr/bin/env node
// Production dependency license audit. Reads package-lock.json for the installed production closure
// (everything not marked dev), reads each package's own package.json, and fails on a license that DreamCart
// should not ship (strong copyleft or unknown). Prints a summary; `--json` prints the full list.
//   npm run licenses

import { readFileSync, existsSync } from "node:fs";

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const ALLOWED = [
  /^MIT$/, /^ISC$/, /^BSD-[23]-Clause$/, /^Apache-2\.0$/, /^0BSD$/, /^BlueOak-1\.0\.0$/, /^CC0-1\.0$/,
  /^Unlicense$/, /^Python-2\.0$/, /^CC-BY-4\.0$/, /^MPL-2\.0$/,
];
// Reviewed exceptions. libvips (LGPL) arrives as prebuilt native binaries (`@img/sharp-libvips-*`), optional
// dependencies of Next.js for server-side `next/image`. DreamCart does not use `next/image`, and these binaries are
// never sent to browsers: they are tooling on the build/host machine, dynamically linked, not part of the shipped bundle.
const EXCEPTIONS = [/^@img\/sharp-/];
const REVIEW = [/LGPL/];
const DENIED = [/^A?GPL/, /^SSPL/, /^BUSL/, /^UNLICENSED$/, /^UNKNOWN$/];

const rows = [];
for (const [path, info] of Object.entries(lock.packages)) {
  if (path === "" || info.dev || info.optional && info.dev) continue;
  const manifest = `${path}/package.json`;
  const pkg = existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")) : {};
  const raw = pkg.license ?? info.license ?? "UNKNOWN";
  const license = typeof raw === "string" ? raw : (raw.type ?? "UNKNOWN");
  rows.push({ name: path.replace(/^.*node_modules\//, ""), version: info.version, license });
}

const flat = (license) => license.replace(/[()]/g, "").split(/\s+(?:OR|AND)\s+/);
const verdict = (license) => {
  const parts = flat(license);
  // "A OR B": acceptable if any alternative is; "A AND B": every part must be.
  const isAnd = /\sAND\s/.test(license);
  const ok = (p) => ALLOWED.some((re) => re.test(p));
  if (parts.some((p) => DENIED.some((re) => re.test(p))) && !parts.some(ok)) return "denied";
  if (isAnd ? parts.every(ok) : parts.some(ok)) return "ok";
  if (parts.some((p) => REVIEW.some((re) => re.test(p)))) return "review";
  return "unknown";
};

const byLicense = new Map();
const problems = [];
for (const row of rows) {
  const v = EXCEPTIONS.some((re) => re.test(row.name)) ? "ok" : verdict(row.license);
  byLicense.set(row.license, (byLicense.get(row.license) ?? 0) + 1);
  if (v !== "ok") problems.push({ ...row, verdict: v });
}

if (process.argv.includes("--json")) console.log(JSON.stringify(rows, null, 2));
console.log(`production packages: ${rows.length}`);
for (const [license, count] of [...byLicense].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${license}`);
}
if (problems.length > 0) {
  console.log("\nneeds a decision:");
  for (const p of problems) console.log(`  ${p.verdict}: ${p.name}@${p.version} (${p.license})`);
  process.exitCode = 1;
} else {
  console.log("license audit OK");
}
