import { describe, expect, it } from "vitest";
import {
  catalogVersion,
  checkMediaFiles,
  EMPTY_CATALOG,
  extractCredits,
  readinessReport,
  validateCatalog,
  type CatalogData,
  type CatalogMode,
  type IssueCode,
} from "./catalog-data";

/** A loose view of the data so tests can corrupt any part of it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

/** Obviously fictional test data ("Acme"): these tests exercise the validator, not a real catalog. */
const NOW = Date.parse("2026-11-30T00:00:00Z");
const price = (over = {}) => ({
  amountMinor: 20_000_000,
  currency: "VND",
  observedAt: "2026-11-25T00:00:00Z",
  provenanceType: "curator_observed",
  observer: "curator-1",
  evidenceNote: "list price viewed on the product page",
  ...over,
});

function good(): CatalogData {
  return {
    sources: [
      {
        id: "acme-shop",
        name: "Acme Shop",
        domain: "shop.acme.test",
        kind: "retailer",
        termsReviewedAt: "2026-11-01",
        persistencePolicy: "snapshot_allowed",
      },
    ],
    products: [
      {
        id: "acme-book",
        brand: "Acme",
        family: "Book",
        model: "14",
        category: "laptop",
        titleVi: "Acme Book 14",
        summaryVi: "Mô tả tự viết.",
        verificationStatus: "verified",
        createdAt: "2026-11-20T00:00:00Z",
        specEvidence: {
          url: "https://shop.acme.test/book-14/specs",
          note: "specifications read on the product page",
        },
      },
    ],
    variants: [
      {
        id: "acme-book:14-m1-8-256",
        productId: "acme-book",
        attributes: { screen_in: 14, chip: "m1", ram_gb: 8, storage_gb: 256 },
        gtin: null,
        variantKey: "screen_in=14;chip=m1;ram_gb=8;storage_gb=256",
      },
      {
        id: "acme-book:14-m1-16-512",
        productId: "acme-book",
        attributes: { screen_in: 14, chip: "m1", ram_gb: 16, storage_gb: 512 },
        gtin: null,
        variantKey: "screen_in=14;chip=m1;ram_gb=16;storage_gb=512",
      },
    ],
    offers: [
      {
        id: "acme-book:14-m1-8-256@acme-shop",
        variantId: "acme-book:14-m1-8-256",
        sourceId: "acme-shop",
        url: "https://shop.acme.test/book-14",
        merchantName: "Acme Shop",
        availability: "unknown",
        price: price(),
      },
    ],
    media: [],
    vocabulary: { chip: { m1: { labelVi: "Chip M1", aliases: ["m1"] } } },
    featured: ["acme-book"],
  } as CatalogData;
}

const check = (data: CatalogData, mode: CatalogMode = "real") =>
  validateCatalog(data, { mode, nowMs: NOW });
const codes = (data: CatalogData, mode?: CatalogMode) =>
  check(data, mode).errors.map((e) => e.code);
function edit(change: (d: Loose) => void): CatalogData {
  const copy = JSON.parse(JSON.stringify(good()));
  change(copy);
  return copy;
}

describe("a valid catalog", () => {
  it("passes, and carries a deterministic content version", () => {
    const result = check(good());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.catalog!.version).toBe(catalogVersion(good()));
    expect(result.catalog!.version).toMatch(/^cat-[0-9a-f]{16}$/);
  });
  it("changes version when any record changes, not when key order changes", () => {
    const a = catalogVersion(good());
    expect(catalogVersion(edit((d) => (d.offers[0].price.amountMinor = 1)))).not.toBe(a);
    expect(
      catalogVersion(
        Object.fromEntries(Object.entries(good()).reverse()) as unknown as CatalogData,
      ),
    ).toBe(a);
  });
  it("the empty catalog is valid (honestly empty, not invented)", () => {
    const r = check(EMPTY_CATALOG);
    expect(r.ok).toBe(true);
    expect(readinessReport(r.catalog!)).toMatchObject({ products: 0, meetsMinimum: false });
  });
});

describe("every class of invalid record fails the build with a descriptive error", () => {
  const cases: [string, IssueCode, (d: Loose) => void][] = [
    ["schema violation", "schema", (d) => (d.products[0].category = "toaster")],
    ["duplicate product id", "duplicate_id", (d) => d.products.push({ ...d.products[0] })],
    ["duplicate offer id", "duplicate_id", (d) => d.offers.push({ ...d.offers[0] })],
    [
      "duplicate variant attributes",
      "duplicate_variant_key",
      (d) => d.variants.push({ ...d.variants[0], id: "acme-book:copy" }),
    ],
    [
      "variant of an unknown product",
      "unknown_reference",
      (d) => (d.variants[0].productId = "ghost"),
    ],
    ["offer for an unknown variant", "unknown_reference", (d) => (d.offers[0].variantId = "ghost")],
    ["offer from an unknown source", "unknown_reference", (d) => (d.offers[0].sourceId = "ghost")],
    [
      "media for an unknown product",
      "unknown_reference",
      (d) =>
        d.media.push({
          id: "m1",
          productId: "ghost",
          kind: "photo",
          file: "media/a.avif",
          altVi: "x",
          width: 1,
          height: 1,
          rights: { status: "PENDING" },
        }),
    ],
    [
      "unverified product",
      "unverified_product",
      (d) => (d.products[0].verificationStatus = "needs_review"),
    ],
    [
      "fixture id in the real catalog",
      "fixture_id_in_real_catalog",
      (d) => (d.sources[0].id = "fx-shop"),
    ],
    ["product without variants", "product_without_variants", (d) => (d.variants = [])],
    [
      "missing required attribute",
      "missing_attribute",
      (d) => delete d.variants[0].attributes.storage_gb,
    ],
    [
      "attribute the category does not have",
      "unknown_attribute",
      (d) => (d.variants[0].attributes.battery = "big"),
    ],
    ["non-numeric RAM", "invalid_attribute", (d) => (d.variants[0].attributes.ram_gb = "eight")],
    [
      "fractional storage",
      "invalid_attribute",
      (d) => (d.variants[0].attributes.storage_gb = 256.5),
    ],
    [
      "chip that is not a slug",
      "invalid_attribute",
      (d) => (d.variants[0].attributes.chip = "M1 Pro!"),
    ],
    [
      "variant id not under its product",
      "invalid_attribute",
      (d) => (d.variants[0].id = "other:thing"),
    ],
    [
      "variantKey that disagrees with the attributes",
      "variant_key_mismatch",
      (d) => (d.variants[0].variantKey = "wrong"),
    ],
    ["javascript: offer link", "unsafe_url", (d) => (d.offers[0].url = "javascript:alert(1)")],
    ["data: offer link", "unsafe_url", (d) => (d.offers[0].url = "data:text/html,x")],
    [
      "offer link with tracking parameters",
      "url_not_cleaned",
      (d) => (d.offers[0].url = "https://shop.acme.test/book-14?utm_source=x"),
    ],
    [
      "offer link on another host",
      "url_domain_mismatch",
      (d) => (d.offers[0].url = "https://evil.example/book-14"),
    ],
    [
      "price observed in the future",
      "future_observation",
      (d) => (d.offers[0].price.observedAt = "2027-01-01T00:00:00Z"),
    ],
    [
      "price without an observer",
      "price_without_provenance",
      (d) => delete d.offers[0].price.observer,
    ],
    [
      "price without evidence",
      "price_without_provenance",
      (d) => delete d.offers[0].price.evidenceNote,
    ],
    [
      "user-entered price in the catalog",
      "user_entered_in_catalog",
      (d) => (d.offers[0].price.provenanceType = "user_entered"),
    ],
    ["zero price (unknown must be null)", "schema", (d) => (d.offers[0].price.amountMinor = 0)],
    [
      "snapshot source whose terms were never reviewed",
      "source_terms_not_reviewed",
      (d) => (d.sources[0].termsReviewedAt = null),
    ],
    [
      "more images than the budget",
      "too_many_images",
      (d) => {
        for (let i = 0; i < 7; i++)
          d.media.push({
            id: `m${i}`,
            productId: "acme-book",
            kind: "photo",
            file: `media/a${i}.avif`,
            altVi: "x",
            width: 1,
            height: 1,
            rights: { status: "PENDING" },
          });
      },
    ],
    ["a coded value with no Vietnamese label", "missing_label", (d) => (d.vocabulary = {})],
    [
      "an alias shared by two values",
      "ambiguous_alias",
      (d) => (d.vocabulary.chip.m2 = { labelVi: "Chip M2", aliases: ["m1"] }),
    ],
    ["a featured product that does not exist", "bad_featured", (d) => (d.featured = ["ghost"])],
    ["a product featured twice", "bad_featured", (d) => (d.featured = ["acme-book", "acme-book"])],
    [
      "a CLEARED image without evidence",
      "schema",
      (d) =>
        d.media.push({
          id: "m1",
          productId: "acme-book",
          kind: "photo",
          file: "media/a.avif",
          altVi: "x",
          width: 1,
          height: 1,
          rights: { status: "CLEARED", basis: "own_work" },
        }),
    ],
  ];
  it.each(cases)("%s", (_name, code, change) => {
    const result = check(edit(change));
    expect(result.ok).toBe(false);
    expect(result.catalog).toBeNull();
    expect(result.errors.map((e) => e.code)).toContain(code);
    for (const e of result.errors) {
      expect(e.path.length).toBeGreaterThan(0);
      expect(e.message.length).toBeGreaterThan(10);
    }
  });
});

describe("synthetic mode keeps fiction isolated", () => {
  const synthetic = () =>
    JSON.parse(JSON.stringify(good()).replace(/acme-/g, "fx-")) as CatalogData;
  it("accepts fx- products (even unverified) and rejects real-looking ids", () => {
    expect(check(synthetic(), "synthetic").ok).toBe(true);
    expect(codes(good(), "synthetic")).toContain("real_id_in_synthetic_catalog");
  });
  it("is never reported as meeting the release minimum", () => {
    const r = readinessReport(check(synthetic(), "synthetic").catalog!);
    expect(r.meetsMinimum).toBe(false);
    expect(r.shortfalls.join()).toContain("synthetic fixtures only");
  });
});

describe("advisories never fail the build", () => {
  it("reports stale prices, blocked sources, unpriced products and missing images", () => {
    const stale = edit((d) => {
      d.offers[0].price.observedAt = "2026-09-01T00:00:00Z";
      d.sources[0].persistencePolicy = "reference_only";
    });
    const r = check(stale);
    expect(r.ok).toBe(true);
    expect(r.warnings.map((w) => w.code).sort()).toEqual([
      "product_without_image",
      "source_policy_blocks_cart",
      "stale_price",
    ]);
    const unpriced = check(edit((d) => (d.offers[0].price = null)));
    expect(unpriced.warnings.map((w) => w.code)).toContain("product_without_price");
  });
});

describe("readiness report", () => {
  it("states plainly what is missing for a first release", () => {
    const r = readinessReport(check(good()).catalog!);
    expect(r).toMatchObject({
      mode: "real",
      products: 1,
      verifiedProducts: 1,
      variants: 2,
      pricedVariants: 1,
      byCategory: { laptop: 1, phone: 0, audio: 0 },
      meetsMinimum: false,
    });
    expect(r.shortfalls).toEqual([
      "1 of 20 minimum verified products",
      "no phone products",
      "no audio products",
    ]);
  });
});

describe("images: budgets and attribution", () => {
  const asset = (id: string, status: "CLEARED" | "PENDING", extra = {}) => ({
    id,
    productId: "acme-book",
    kind: "photo" as const,
    file: `media/${id}.avif`,
    altVi: "x",
    width: 10,
    height: 10,
    rights: {
      status,
      ...(status === "CLEARED"
        ? {
            basis: "open_license" as const,
            evidence: "https://license.test/x",
            attributionText: `Ảnh ${id} © Tác giả`,
          }
        : {}),
      ...extra,
    },
  });
  it("flags missing and oversized files; a missing file for a pending asset is fine", () => {
    const media = [asset("a", "CLEARED"), asset("b", "CLEARED"), asset("c", "PENDING")];
    const issues = checkMediaFiles(media, { "media/a.avif": 1000, "media/b.avif": 2_000_000 });
    expect(issues.map((i) => i.message)).toEqual([expect.stringContaining("is 2000000 bytes")]);
    expect(checkMediaFiles([asset("z", "CLEARED")], {}).map((i) => i.message)[0]).toContain(
      "does not exist",
    );
  });
  it("extracts credits for cleared, attributed images only, sorted", () => {
    const credits = extractCredits([
      asset("b", "CLEARED"),
      asset("a", "CLEARED"),
      asset("c", "PENDING"),
      asset("d", "CLEARED", { attributionText: undefined }),
    ]);
    expect(credits.map((c) => c.mediaId)).toEqual(["a", "b"]);
    expect(credits[0]).toMatchObject({
      attributionText: "Ảnh a © Tác giả",
      productId: "acme-book",
    });
  });
});

describe("verified products carry their provenance", () => {
  it("a verified product without spec evidence is refused in the real catalog", () => {
    const d = good() as Loose;
    delete d.products[0].specEvidence;
    const r = validateCatalog(d, { mode: "real", nowMs: NOW });
    expect(r.errors.map((e) => e.code)).toContain("product_without_evidence");
  });

  it("the evidence link must be a safe http(s) URL", () => {
    const d = good() as Loose;
    d.products[0].specEvidence.url = "javascript:alert(1)";
    const r = validateCatalog(d, { mode: "real", nowMs: NOW });
    expect(r.errors.map((e) => e.code)).toContain("unsafe_url");
  });
});
