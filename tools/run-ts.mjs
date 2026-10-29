// Runs a TypeScript tool through esbuild (already a dev dependency), resolving the "@/..." path alias.
// Usage: node tools/run-ts.mjs tools/some-tool.ts [args...]
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

const [entry, ...rest] = process.argv.slice(2);
if (!entry) {
  console.error("usage: node tools/run-ts.mjs <file.ts> [args...]");
  process.exit(2);
}
const outDir = join("node_modules", ".cache", "dreamcart-tools");
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, `${basename(entry, ".ts")}.mjs`);
await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  tsconfig: "tsconfig.json",
  logLevel: "error",
  banner: { js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' },
});
process.argv = [process.argv[0], entry, ...rest];
await import(pathToFileURL(join(process.cwd(), outfile)).href);
