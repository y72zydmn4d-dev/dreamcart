// Catalog tooling: validate the data files (the build gate) and convert curation CSV into catalog JSON.
//   npm run catalog:check                 validate data/catalog (real) and data/synthetic
//   npm run catalog:import -- file.csv --basis <written_permission|licensed_dataset|owner_original_data> [--target staging|verified]
//                                         convert a curation CSV into catalog JSON (needs sources.json). The basis must be
//                                         permitted in the compliance register (ADR-015); the default target is the staged
//                                         Apple catalog, never the verified one.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  activationSchema,
  checkImportBasis,
  checkMediaFiles,
  complianceRegisterSchema,
  coverageReport,
  importCuration,
  readinessReport,
  validateCatalog,
  validateInventory,
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
  if (!checkProgram()) failed = true;
  console.log(failed ? "catalog check FAILED" : "catalog check OK");
  return failed ? 1 : 0;
}

/** The Apple Store Vietnam program: activation setting, staged catalog, inventory manifest, compliance register. */
const STAGING_DIR = "data/catalog-staging/apple-vn";
function checkProgram(): boolean {
  let ok = true;
  const fail = (message: string) => {
    console.log(`  ERROR ${message}`);
    ok = false;
  };

  const activation = activationSchema.safeParse(JSON.parse(readFileSync("data/catalog/activation.json", "utf8")));
  if (!activation.success) for (const i of activation.error.issues) fail(`activation.json ${i.path.join(".")}: ${i.message}`);
  else console.log(`activation: ${activation.data.mode}`);

  const staged = loadDir(STAGING_DIR);
  const stagedResult = validateCatalog(staged, { mode: "real", nowMs: Date.now() });
  console.log(`staged catalog (${STAGING_DIR}): ${staged.products.length} products, ${staged.variants.length} variants, ${staged.offers.length} offers`);
  print("ERROR", stagedResult.errors);
  if (!stagedResult.ok) ok = false;

  const inventory = validateInventory(JSON.parse(readFileSync(join(STAGING_DIR, "inventory/manifest.json"), "utf8")));
  for (const e of inventory.errors) fail(`inventory [${e.code}] ${e.path}: ${e.message}`);
  if (inventory.manifest) {
    const r = coverageReport(inventory.manifest);
    console.log(
      `inventory: ${r.listingsDiscovered} listings (${r.uniqueProducts} unique), ${r.verified} verified, ${r.blocked} blocked, ${r.excluded} excluded; ` +
        `pages ${r.pagesInspected}/${r.pagesDiscovered} inspected; prices exact ${r.priceExact}, starting-from ${r.priceStartingFrom}; ` +
        `images cleared ${r.imagesCleared}; staged ${r.staged}, published ${r.published}`,
    );
    console.log(`  ${r.statement}`);
    // Records recorded as staged or published must exist in the staged catalog: the manifest never overstates.
    const claimed = r.staged + r.published;
    if (claimed > staged.products.length)
      fail(`inventory claims ${claimed} staged or published listings but the staged catalog has ${staged.products.length} products`);
  }
  const compliance = complianceRegisterSchema.safeParse(JSON.parse(readFileSync(join(STAGING_DIR, "inventory/compliance.json"), "utf8")));
  if (!compliance.success) for (const i of compliance.error.issues) fail(`compliance.json ${i.path.join(".")}: ${i.message}`);
  return ok;
}

function importCsv(args: string[]): number {
  const flag = (name: string): string | undefined => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const file = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
  const basis = flag("--basis");
  const target = flag("--target") ?? "staging";
  if (!file || !basis || (target !== "staging" && target !== "verified")) {
    console.error(
      "usage: npm run catalog:import -- <curation.csv> --basis <written_permission|licensed_dataset|owner_original_data> [--target staging|verified]",
    );
    return 2;
  }
  // The gate comes first: nothing is read from the file unless the register permits where its facts came from.
  const register = complianceRegisterSchema.parse(JSON.parse(readFileSync(join(STAGING_DIR, "inventory/compliance.json"), "utf8")));
  const gate = checkImportBasis(register, basis);
  if (!gate.ok) {
    console.log(`  REFUSED: ${gate.reason}`);
    console.log("import REFUSED: nothing was read or written (see data/catalog-staging/apple-vn/inventory/compliance.json)");
    return 1;
  }
  const dir = target === "staging" ? STAGING_DIR : "data/catalog";
  const sources = read(dir, "sources") as CatalogData["sources"];
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
  console.log(`imported ${result.products.length} products, ${result.variants.length} variants, ${result.offers.length} offers, ${result.media.length} images into ${dir} (basis ${basis})`);
  return check();
}

const [command, ...rest] = process.argv.slice(2);
process.exit(command === "check" ? check() : command === "import" ? importCsv(rest) : (console.error("usage: catalog-cli <check|import>"), 2));
