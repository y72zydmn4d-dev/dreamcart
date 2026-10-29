// Catalog tooling: validate the data files (the build gate) and convert curation CSV into catalog JSON.
//   npm run catalog:check                 validate data/catalog (real) and data/synthetic
//   npm run catalog:import -- file.csv    convert a curation CSV into data/catalog/*.json (needs sources.json)
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkMediaFiles,
  importCuration,
  readinessReport,
  validateCatalog,
  type CatalogData,
  type CatalogIssue,
  type CatalogMode,
} from "@/modules/catalog";

const read = (dir: string, name: string): unknown => JSON.parse(readFileSync(join(dir, `${name}.json`), "utf8"));
function loadDir(dir: string): CatalogData {
  return {
    sources: read(dir, "sources"),
    products: read(dir, "products"),
    variants: read(dir, "variants"),
    offers: read(dir, "offers"),
    media: read(dir, "media"),
    vocabulary: read(dir, "vocabulary"),
    featured: read(dir, "featured"),
  } as CatalogData;
}

function publicFiles(): Record<string, number> {
  const out: Record<string, number> = {};
  const walk = (dir: string, prefix: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path, `${prefix}${name}/`);
      else out[`${prefix}${name}`] = statSync(path).size;
    }
  };
  walk("public", "");
  return out;
}

const print = (label: string, issues: readonly CatalogIssue[]) => {
  for (const i of issues) console.log(`  ${label} [${i.code}] ${i.path}: ${i.message}`);
};

function check(): number {
  let failed = false;
  for (const [mode, dir] of [["real", "data/catalog"], ["synthetic", "data/synthetic"]] as [CatalogMode, string][]) {
    const data = loadDir(dir);
    const result = validateCatalog(data, { mode, nowMs: Date.now() });
    const files = mode === "real" ? checkMediaFiles(data.media, publicFiles()) : [];
    console.log(`${mode} catalog (${dir}): ${data.products.length} products, ${data.variants.length} variants, ${data.offers.length} offers`);
    print("ERROR", result.errors);
    print("ERROR", files);
    if (!result.ok || files.length > 0) failed = true;
    if (mode === "real" && result.catalog) {
      const stale = result.warnings.filter((w) => w.code === "stale_price");
      if (stale.length > 0) console.log(`  advisory: ${stale.length} price(s) past their freshness window need a re-check`);
      const r = readinessReport(result.catalog);
      console.log(`  readiness: ${r.meetsMinimum ? "meets the release minimum" : "NOT ready for a real release: " + r.shortfalls.join("; ")}`);
    }
  }
  console.log(failed ? "catalog check FAILED" : "catalog check OK");
  return failed ? 1 : 0;
}

function importCsv(file: string | undefined): number {
  if (!file) {
    console.error("usage: npm run catalog:import -- <curation.csv>");
    return 2;
  }
  const dir = "data/catalog";
  const sources = (read(dir, "sources") as CatalogData["sources"]);
  const result = importCuration(readFileSync(file, "utf8"), sources);
  if (!result.ok) {
    for (const e of result.errors) console.log(`  ERROR line ${e.line}${e.column ? ` column ${e.column}` : ""}: ${e.message}`);
    console.log("import FAILED: nothing was written");
    return 1;
  }
  const write = (name: string, data: unknown) => writeFileSync(join(dir, `${name}.json`), JSON.stringify(data, null, 2) + "\n");
  write("products", result.products);
  write("variants", result.variants);
  write("offers", result.offers);
  write("media", result.media);
  console.log(`imported ${result.products.length} products, ${result.variants.length} variants, ${result.offers.length} offers, ${result.media.length} images`);
  return check();
}

const [command, arg] = process.argv.slice(2);
process.exit(command === "check" ? check() : command === "import" ? importCsv(arg) : (console.error("usage: catalog-cli <check|import>"), 2));
