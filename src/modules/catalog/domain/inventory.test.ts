import { describe, expect, it } from "vitest";
import {
  ACQUISITION_METHODS,
  checkImportBasis,
  IMPORT_BASES,
  canonicalKey,
  complianceRegisterSchema,
  coverageReport,
  methodPermitted,
  normalizeListingUrl,
  validateInventory,
  type InventoryListing,
} from "./inventory";

/** Shapes only: these are test records for the validator, not claims about any real store listing. */
const listing = (over: Partial<InventoryListing> = {}): InventoryListing => ({
  id: "inv-1",
  manufacturer: "Example Maker",
  merchant: "Example Store",
  title: "Example thing",
  primaryCategory: "audio",
  secondaryCategories: [],
  family: "Thing",
  model: "T1",
  packageQuantity: 1,
  listingUrl: "https://store.example.test/vn/thing-1",
  discoveryUrl: "https://store.example.test/vn/audio",
  discoveredAt: "2026-10-30T00:00:00.000Z",
  region: "VN",
  listingStatus: "currently_offered",
  verificationStatus: "discovered",
  priceStatus: "unverified",
  imageStatus: "PENDING_REVIEW",
  importStatus: "not_imported",
  lastVerifiedAt: null,
  dispositionReason: null,
  ...over,
});
const manifest = (listings: unknown[], over: Record<string, unknown> = {}) => ({
  source: { id: "example-store", name: "Example Store", region: "VN", currency: "VND" },
  coverage: { basis: "unknown", evidence: null, enumeratedAt: null },
  pages: [],
  listings,
  ...over,
});

describe("inventory listing rules", () => {
  it("accepts a well-formed discovered listing", () => {
    expect(validateInventory(manifest([listing()])).ok).toBe(true);
  });

  it("an empty manifest is valid and reports zero, not a percentage", () => {
    const v = validateInventory(manifest([]));
    expect(v.ok).toBe(true);
    const report = coverageReport(v.manifest!);
    expect(report.listingsDiscovered).toBe(0);
    expect(report.verifiedShareOfDiscovered).toBeNull();
    expect(report.statement).toContain("UNKNOWN");
  });

  it("a blocked or excluded listing needs its reason", () => {
    for (const status of ["blocked", "excluded"] as const) {
      const v = validateInventory(manifest([listing({ verificationStatus: status })]));
      expect(v.ok).toBe(false);
      expect(v.errors[0]!.path).toContain("dispositionReason");
    }
    expect(
      validateInventory(
        manifest([
          listing({
            verificationStatus: "excluded",
            dispositionReason: "service plan, not hardware",
          }),
        ]),
      ).ok,
    ).toBe(true);
  });

  it("a verified listing records when; an exact price needs a verified listing", () => {
    expect(validateInventory(manifest([listing({ verificationStatus: "verified" })])).ok).toBe(
      false,
    );
    expect(validateInventory(manifest([listing({ priceStatus: "exact" })])).ok).toBe(false);
    expect(
      validateInventory(
        manifest([
          listing({
            verificationStatus: "verified",
            lastVerifiedAt: "2026-10-30T01:00:00.000Z",
            priceStatus: "exact",
          }),
        ]),
      ).ok,
    ).toBe(true);
  });

  it("an unverified listing cannot be imported, and publishing needs a cleared image or none", () => {
    expect(validateInventory(manifest([listing({ importStatus: "staged" })])).ok).toBe(false);
    const verified = {
      verificationStatus: "verified" as const,
      lastVerifiedAt: "2026-10-30T01:00:00.000Z",
    };
    expect(
      validateInventory(
        manifest([
          listing({ ...verified, importStatus: "published", imageStatus: "PENDING_REVIEW" }),
        ]),
      ).ok,
    ).toBe(false);
    expect(
      validateInventory(
        manifest([listing({ ...verified, importStatus: "published", imageStatus: "RESTRICTED" })]),
      ).ok,
    ).toBe(false);
    expect(
      validateInventory(
        manifest([listing({ ...verified, importStatus: "published", imageStatus: "CLEARED" })]),
      ).ok,
    ).toBe(true);
    expect(
      validateInventory(
        manifest([listing({ ...verified, importStatus: "published", imageStatus: "UNAVAILABLE" })]),
      ).ok,
    ).toBe(true);
  });

  it("only https listing URLs without credentials", () => {
    for (const url of [
      "http://store.example.test/x",
      "https://user:pw@store.example.test/x",
      "not a url",
    ]) {
      expect(validateInventory(manifest([listing({ listingUrl: url })])).ok, url).toBe(false);
    }
  });

  it("claims the store is complete only with evidence", () => {
    const attested = {
      basis: "complete",
      evidence: "walked every category page",
      enumeratedAt: "2026-10-30T02:00:00.000Z",
    };
    expect(validateInventory(manifest([], { coverage: attested })).ok).toBe(true);
    expect(
      validateInventory(
        manifest([], { coverage: { basis: "complete", evidence: null, enumeratedAt: null } }),
      ).ok,
    ).toBe(false);
  });
});

describe("deduplication", () => {
  it("normalizes URLs: query, fragment, host case and trailing slash do not make a different listing", () => {
    expect(normalizeListingUrl("https://Store.Example.test/vn/thing-1/?utm_source=x#top")).toBe(
      "https://store.example.test/vn/thing-1",
    );
  });

  it("rejects the same listing recorded twice, and the same product under a different URL", () => {
    const a = listing({ id: "a" });
    const sameUrl = listing({
      id: "b",
      family: "Other",
      listingUrl: "https://store.example.test/vn/thing-1/?ref=home",
    });
    const sameProduct = listing({
      id: "c",
      listingUrl: "https://store.example.test/vn/seasonal/thing-1",
    });
    const codes = (l: InventoryListing[]) =>
      validateInventory(manifest(l)).errors.map((e) => e.code);
    expect(codes([a, sameUrl])).toContain("duplicate_listing_url");
    expect(codes([a, sameProduct])).toContain("duplicate_identity");
    expect(
      codes([a, listing({ id: "a", model: "T2", listingUrl: "https://store.example.test/vn/t2" })]),
    ).toContain("duplicate_id");
  });

  it("identity folds Vietnamese diacritics and case, and keeps package quantity", () => {
    const base = {
      manufacturer: "Hãng Ví Dụ",
      family: "Tai nghe",
      model: "Pro",
      packageQuantity: 1,
    };
    expect(canonicalKey(base)).toBe(
      canonicalKey({ ...base, manufacturer: "hang vi du", family: "TAI NGHE" }),
    );
    expect(canonicalKey(base)).not.toBe(canonicalKey({ ...base, packageQuantity: 4 }));
  });

  it("a product may have extra categories but not repeat its primary one", () => {
    expect(
      validateInventory(manifest([listing({ secondaryCategories: ["accessory_third_party"] })])).ok,
    ).toBe(true);
    expect(validateInventory(manifest([listing({ secondaryCategories: ["audio"] })])).ok).toBe(
      false,
    );
  });
});

describe("coverage report", () => {
  it("counts each status independently and never merges them", () => {
    const verified = {
      verificationStatus: "verified" as const,
      lastVerifiedAt: "2026-10-30T01:00:00.000Z",
    };
    const listings = [
      listing({ id: "a" }),
      listing({
        id: "b",
        model: "B",
        listingUrl: "https://store.example.test/vn/b",
        ...verified,
        priceStatus: "exact",
        imageStatus: "CLEARED",
      }),
      listing({
        id: "c",
        model: "C",
        listingUrl: "https://store.example.test/vn/c",
        ...verified,
        priceStatus: "starting_from",
        imageStatus: "UNAVAILABLE",
        primaryCategory: "mac",
      }),
      listing({
        id: "d",
        model: "D",
        listingUrl: "https://store.example.test/vn/d",
        verificationStatus: "blocked",
        dispositionReason: "page inaccessible",
      }),
    ];
    const v = validateInventory(
      manifest(listings, {
        pages: [
          {
            url: "https://store.example.test/vn/audio",
            category: "audio",
            status: "inspected",
            note: null,
          },
          {
            url: "https://store.example.test/vn/mac",
            category: "mac",
            status: "inaccessible",
            note: "403",
          },
        ],
        coverage: { basis: "partial", evidence: null, enumeratedAt: null },
      }),
    );
    expect(v.errors).toEqual([]);
    const r = coverageReport(v.manifest!);
    expect(r).toMatchObject({
      listingsDiscovered: 4,
      uniqueProducts: 4,
      verified: 2,
      blocked: 1,
      priceExact: 1,
      priceStartingFrom: 1,
      priceUnverified: 2,
      imagesCleared: 1,
      imagesUnavailable: 1,
      imagesPending: 2,
      pagesDiscovered: 2,
      pagesInspected: 1,
      pagesInaccessible: 1,
      verifiedShareOfDiscovered: null,
    });
    expect(r.byCategory.mac).toBe(1);
    expect(r.byCategory.audio).toBe(3);
    expect(r.statement).toContain("PARTIAL");
  });

  it("reports a share only when the enumeration is attested complete", () => {
    const attested = {
      basis: "complete",
      evidence: "walked every category page",
      enumeratedAt: "2026-10-30T02:00:00.000Z",
    };
    const v = validateInventory(
      manifest(
        [
          listing({
            id: "a",
            verificationStatus: "verified",
            lastVerifiedAt: "2026-10-30T01:00:00.000Z",
          }),
          listing({ id: "b", model: "B", listingUrl: "https://store.example.test/vn/b" }),
        ],
        { coverage: attested },
      ),
    );
    expect(coverageReport(v.manifest!).verifiedShareOfDiscovered).toBe(0.5);
  });
});

describe("source compliance register", () => {
  const register = (entries: unknown[]) =>
    complianceRegisterSchema.safeParse({ source: "example-store", entries });
  const entry = (over: Record<string, unknown>) => ({
    method: "automated_page_collection",
    status: "unreviewed",
    evidence: null,
    reviewedAt: null,
    reviewedBy: null,
    note: null,
    ...over,
  });

  it("a decision other than 'unreviewed' needs evidence and a date", () => {
    expect(register([entry({ status: "permitted" })]).success).toBe(false);
    expect(
      register([
        entry({
          status: "restricted",
          evidence: "terms section 4, read 2026-10-30",
          reviewedAt: "2026-10-30",
        }),
      ]).success,
    ).toBe(true);
  });

  it("only an explicitly permitted method may be used", () => {
    const r = register([
      entry({
        method: "owner_original_data",
        status: "permitted",
        evidence: "curation process",
        reviewedAt: "2026-10-30",
      }),
      entry({
        method: "image_rehosting",
        status: "restricted",
        evidence: "ADR-010",
        reviewedAt: "2026-10-30",
      }),
      entry({ method: "documented_structured_feed" }),
    ]).data!;
    expect(methodPermitted(r, "owner_original_data")).toBe(true);
    expect(methodPermitted(r, "image_rehosting")).toBe(false); // restricted
    expect(methodPermitted(r, "documented_structured_feed")).toBe(false); // unreviewed
    expect(methodPermitted(r, "automated_page_collection")).toBe(false); // not listed at all
  });

  it("lists every method the program distinguishes", () => {
    expect(ACQUISITION_METHODS).toContain("image_hotlinking");
  });
});

describe("import basis gate", () => {
  const entry = (method: string, status: string) => ({
    method,
    status,
    evidence: status === "unreviewed" ? null : "evidence",
    reviewedAt: status === "unreviewed" ? null : "2026-10-30",
    reviewedBy: null,
    note: status === "restricted" ? "terms ask for written consent" : null,
  });
  const register = (...entries: ReturnType<typeof entry>[]) =>
    complianceRegisterSchema.parse({ source: "example-store", entries });

  it("passes only a basis the register marks permitted", () => {
    const r = register(entry("written_permission", "permitted"));
    expect(checkImportBasis(r, "written_permission")).toEqual({ ok: true });
  });

  it("refuses restricted, unreviewed, missing and unknown bases, each with its own reason", () => {
    const r = register(
      entry("licensed_dataset", "restricted"),
      entry("owner_original_data", "unreviewed"),
    );
    const refused = (basis: string) => {
      const result = checkImportBasis(r, basis);
      expect(result.ok).toBe(false);
      return result.ok ? "" : result.reason;
    };
    expect(refused("licensed_dataset")).toContain("restricted");
    expect(refused("owner_original_data")).toContain("not been reviewed");
    expect(refused("written_permission")).toContain("no entry");
    expect(refused("scraped")).toContain("unknown basis");
  });

  it("every declarable basis is a register method, so it can be decided there", () => {
    for (const basis of IMPORT_BASES) expect(ACQUISITION_METHODS).toContain(basis);
  });
});
