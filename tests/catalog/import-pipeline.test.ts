import { describe, expect, it } from "vitest";
import {
  columnsFor,
  importCuration,
  preflight,
  preflightPassed,
  reconcileInventory,
  validateCatalog,
  validateInventory,
  type CatalogData,
  type Source,
} from "@/modules/catalog";
import { NOW } from "../support/fictional-catalog";

/**
 * The whole import path on FICTIONAL rows ("Testmark", example.test): CSV -> records -> validation -> inventory
 * reconciliation -> activation checklist. None of it is catalog data; it proves the pipeline and its refusals.
 */
const sources: Source[] = [
  {
    id: "test-store",
    name: "Test Store",
    domain: "store.example.test",
    kind: "retailer",
    termsReviewedAt: "2026-10-01",
    persistencePolicy: "snapshot_allowed",
  },
];

const row = (over: Record<string, string> = {}): Record<string, string> => ({
  brand: "Testmark",
  family: "Tab",
  model: "T1",
  category: "tablet",
  screen_in: "11",
  storage_gb: "128",
  connectivity: "wifi",
  offer_merchant: "Test Store",
  offer_url: "https://store.example.test/p/tab-t1-128",
  offer_currency: "VND",
  price_amount_minor: "10000000",
  price_observed_at: "2026-10-20",
  price_observer: "test-curator",
  price_provenance_type: "curator_observed",
  price_kind: "list_price_exact_configuration",
  price_evidence_note: "test fixture, not a real observation",
  availability: "unknown",
  title_vi: "Testmark Tab T1",
  summary_vi: "Dữ liệu thử nghiệm, không phải sản phẩm thật.",
  spec_evidence_url: "https://store.example.test/p/tab-t1/specs",
  spec_evidence_note: "test fixture",
  verified_by: "second-checker",
  verified_at: "2026-10-21",
  ...over,
});
const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const csv = (rows: Record<string, string>[], columns = columnsFor("tablet")) =>
  [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c] ?? "")).join(","))].join("\n");

const goodRows = () => [
  row(),
  row({
    storage_gb: "256",
    offer_url: "https://store.example.test/p/tab-t1-256",
    price_amount_minor: "12000000",
  }),
  row({
    storage_gb: "256",
    connectivity: "cellular",
    offer_url: "https://store.example.test/p/tab-t1-256c",
    price_amount_minor: "14000000",
  }),
];

function catalogFrom(rows: Record<string, string>[]) {
  const result = importCuration(csv(rows), sources);
  expect(result.errors).toEqual([]);
  const vocabulary: CatalogData["vocabulary"] = {};
  for (const v of result.variants)
    for (const [k, val] of Object.entries(v.attributes))
      if (typeof val === "string") (vocabulary[k] ??= {})[val] = { labelVi: val, aliases: [] };
  const data: CatalogData = {
    sources,
    products: result.products,
    variants: result.variants,
    offers: result.offers,
    media: result.media,
    vocabulary,
    featured: [],
  };
  return data;
}

const manifestFor = (over: Record<string, unknown> = {}) => ({
  source: { id: "test-store", name: "Test Store", region: "VN", currency: "VND" },
  coverage: { basis: "partial", evidence: null, enumeratedAt: null },
  pages: [],
  listings: [
    {
      id: "inv-tab",
      manufacturer: "Testmark",
      merchant: "Test Store",
      title: "Testmark Tab T1",
      primaryCategory: "audio", // the program categories are a store taxonomy; the listing only needs a valid one
      family: "Tab",
      model: "T1",
      packageQuantity: 1,
      listingUrl: "https://store.example.test/p/tab-t1",
      discoveryUrl: "https://store.example.test/tablets",
      discoveredAt: "2026-10-20T00:00:00.000Z",
      region: "VN",
      listingStatus: "currently_offered",
      verificationStatus: "verified",
      priceStatus: "exact",
      imageStatus: "UNAVAILABLE",
      importStatus: "staged",
      lastVerifiedAt: "2026-10-21T00:00:00.000Z",
      dispositionReason: null,
      ...over,
    },
  ],
});

const entry = (method: string, status: string) => ({
  method,
  status,
  evidence: status === "unreviewed" ? null : "test evidence",
  reviewedAt: status === "unreviewed" ? null : "2026-10-30",
  reviewedBy: null,
  note: null,
});
const register = (...entries: ReturnType<typeof entry>[]) => ({ source: "test-store", entries });
const permitted = register(entry("written_permission", "permitted"));
const blocked = register(
  entry("written_permission", "restricted"),
  entry("owner_original_data", "unreviewed"),
);

describe("CSV to staged catalog", () => {
  it("imports a tablet file with only tablet columns into valid catalog records", () => {
    const data = catalogFrom(goodRows());
    expect(data.products.map((p) => p.id)).toEqual(["testmark-tab-t1"]); // derived, stable
    expect(data.variants).toHaveLength(3);
    expect(data.offers.every((o) => o.price?.currency === "VND")).toBe(true);
    expect(validateCatalog(data, { mode: "real", nowMs: NOW }).errors).toEqual([]);
  });

  it("each variant matches its own offer exactly, and a missing price stays unknown (never zero)", () => {
    const rows = goodRows();
    rows[1] = {
      ...rows[1]!,
      price_amount_minor: "",
      price_observed_at: "",
      price_provenance_type: "",
      price_kind: "",
      price_evidence_note: "",
      offer_currency: "",
    };
    const data = catalogFrom(rows);
    const byVariant = new Map(data.offers.map((o) => [o.variantId, o]));
    expect(byVariant.size).toBe(3);
    expect(byVariant.get("testmark-tab-t1:11-128-wifi")!.price!.amountMinor).toBe(10_000_000);
    expect(byVariant.get("testmark-tab-t1:11-256-wifi")!.price).toBeNull();
  });
});

describe("import failures name the row, the column and the fix", () => {
  const errorsOf = (rows: Record<string, string>[], columns?: string[]) =>
    importCuration(csv(rows, columns), sources).errors.map((e) => `${e.line}:${e.column ?? "-"}`);

  it("refuses a source that has no record, an unsafe link, a price with no offer and a non-slug value", () => {
    expect(errorsOf([row({ offer_url: "https://unknown.example.test/p" })])).toContain(
      "2:offer_url",
    );
    expect(errorsOf([row({ offer_url: "javascript:alert(1)" })])).toContain("2:offer_url");
    expect(errorsOf([row({ offer_url: "" })])).toContain("2:offer_url");
    expect(errorsOf([row({ connectivity: "Wi-Fi" })])).toContain("2:connectivity");
  });

  it("marks the whole file as failed when any row is bad, which is what stops the command writing anything", () => {
    const result = importCuration(
      csv([row(), row({ storage_gb: "abc", offer_url: "https://store.example.test/p/x" })]),
      sources,
    );
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.every((e) => e.line >= 2)).toBe(true); // each error points at a row
  });

  it("refuses an attribute that belongs to another category", () => {
    const columns = [...columnsFor("tablet"), "glass"];
    expect(errorsOf([row({ glass: "standard" })], columns)).toContain("2:glass");
  });
});

describe("inventory reconciliation: the manifest never overstates", () => {
  const catalog = () => catalogFrom(goodRows());
  const manifest = (over?: Record<string, unknown>) =>
    validateInventory(manifestFor(over)).manifest!;

  it("agrees when each staged listing has its product, price and image status", () => {
    expect(reconcileInventory(manifest(), catalog())).toEqual([]);
  });

  it("flags a staged listing without a product, and a product nobody recorded", () => {
    const codes = (m: ReturnType<typeof manifest>, c: CatalogData) =>
      reconcileInventory(m, c).map((i) => i.code);
    expect(codes(manifest({ family: "Other" }), catalog())).toEqual(
      expect.arrayContaining(["listing_without_product", "product_without_listing"]),
    );
  });

  it("flags a claimed exact price or cleared image that the catalog cannot back", () => {
    const unpriced = catalogFrom(
      goodRows().map((r) => ({
        ...r,
        price_amount_minor: "",
        price_observed_at: "",
        price_provenance_type: "",
        price_kind: "",
        price_evidence_note: "",
        offer_currency: "",
      })),
    );
    expect(reconcileInventory(manifest(), unpriced).map((i) => i.code)).toContain(
      "price_status_unbacked",
    );
    expect(
      reconcileInventory(manifest({ imageStatus: "CLEARED" }), catalog()).map((i) => i.code),
    ).toContain("image_status_unbacked");
  });

  it("does not look at listings that were never imported", () => {
    expect(
      reconcileInventory(
        manifest({
          importStatus: "not_imported",
          verificationStatus: "discovered",
          priceStatus: "unverified",
          lastVerifiedAt: null,
        }),
        catalog(),
      ).map((i) => i.code),
    ).toEqual(["product_without_listing"]);
  });
});

describe("activation checklist", () => {
  const input = (over: Record<string, unknown> = {}) => ({
    activation: { mode: "SYNTHETIC_DEMO", ownerAuthorization: null },
    staged: catalogFrom(goodRows()),
    manifest: manifestFor(),
    register: permitted,
    nowMs: NOW,
    target: "staging" as const,
    ...over,
  });
  const status = (checks: ReturnType<typeof preflight>, id: string) =>
    checks.find((c) => c.id === id)!.status;

  it("passes for staging when records validate, reconcile and rest on a permitted basis", () => {
    const checks = preflight(input());
    expect(preflightPassed(checks)).toBe(true);
    expect(status(checks, "compliance")).toBe("pass");
  });

  it("blocks when no acquisition basis is permitted", () => {
    const checks = preflight(input({ register: blocked }));
    expect(status(checks, "compliance")).toBe("fail");
    expect(preflightPassed(checks)).toBe(false);
  });

  it("blocks an empty staged catalog", () => {
    const empty: CatalogData = {
      sources: [],
      products: [],
      variants: [],
      offers: [],
      media: [],
      vocabulary: {},
      featured: [],
    };
    const checks = preflight(
      input({ staged: empty, manifest: { ...manifestFor(), listings: [] } }),
    );
    expect(status(checks, "staged_nonempty")).toBe("fail");
  });

  it("blocks a CLEARED image whose basis the register does not permit", () => {
    const staged = catalogFrom(
      goodRows().map((r, i) =>
        i === 0
          ? {
              ...r,
              image_file: "img/a.jpg",
              image_alt_vi: "Ảnh",
              image_width: "800",
              image_height: "600",
              image_rights_status: "CLEARED",
              image_rights_basis: "open_license",
              image_rights_evidence: "licence page, 2026-10-30",
            }
          : r,
      ),
    );
    const checks = preflight(input({ staged }));
    expect(status(checks, "image_rights")).toBe("fail");
    const ok = preflight(
      input({
        staged,
        register: register(
          entry("written_permission", "permitted"),
          entry("open_license_images", "permitted"),
        ),
      }),
    );
    expect(status(ok, "image_rights")).toBe("pass");
  });

  it("blocks a manifest that disagrees with the staged catalog", () => {
    const checks = preflight(input({ manifest: manifestFor({ family: "Other" }) }));
    expect(status(checks, "inventory_reconciled")).toBe("fail");
  });

  it("verified activation also needs the release gate and a recorded owner authorization", () => {
    const checks = preflight(input({ target: "verified" }));
    expect(status(checks, "release_gate")).toBe("fail");
    expect(status(checks, "owner_authorization")).toBe("fail");
    expect(preflightPassed(checks)).toBe(false);
  });

  it("reports coverage as information and never lets it block on its own", () => {
    const coverage = preflight(input()).find((c) => c.id === "coverage")!;
    expect(coverage.status).toBe("info");
    expect(coverage.details.join(" ")).toContain("PARTIAL");
  });
});
