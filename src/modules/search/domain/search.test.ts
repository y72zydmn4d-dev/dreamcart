import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BASE_VOCABULARY,
  searchCatalog,
  type SearchOutcome,
  type SearchProduct,
  type SearchVocabulary,
} from "./search";

const load = (path: string) => JSON.parse(readFileSync(join(process.cwd(), path), "utf8"));
const catalog = load("fixtures/search/fixture-catalog.json") as { products: SearchProduct[] };
const { fixtures } = load("fixtures/search/queries.json") as {
  fixtures: {
    id: string;
    intent: string;
    query: string;
    expected: {
      status: string;
      results: { productId: string; class: string; variantIds?: string[]; reasons?: string[] }[];
    };
  }[];
};

// The fixture catalog's chip vocabulary is `fx<digit>`; a real catalog supplies its own (Phase 5).
const FIXTURE_VOCABULARY: SearchVocabulary = {
  ...BASE_VOCABULARY,
  isChip: (w) => /^fx\d$/.test(w),
};

const canonical = (o: SearchOutcome | (typeof fixtures)[number]["expected"]) => ({
  status: o.status,
  results: o.results.map((r) => ({
    productId: r.productId,
    class: r.class,
    variantIds: r.variantIds ?? [],
    reasons: r.reasons ?? [],
  })),
});

describe("search conformance (fixtures F01–F42)", () => {
  it.each(fixtures.map((f) => [`${f.id} ${f.query.trim() || "(blank)"}`, f] as const))(
    "%s",
    (_name, f) => {
      expect(canonical(searchCatalog(catalog.products, f.query, FIXTURE_VOCABULARY))).toEqual(
        canonical(f.expected),
      );
    },
  );
});

describe("search guarantees", () => {
  const search = (q: string) => searchCatalog(catalog.products, q, FIXTURE_VOCABULARY);

  it("never reports an exact variant for near or ambiguous results", () => {
    for (const f of fixtures) {
      for (const r of search(f.query).results) {
        if (r.class !== "match") expect(r.variantIds).toEqual([]);
        if (r.class === "match") expect(r.variantIds.length).toBeGreaterThan(0);
      }
    }
  });

  it("treats a missing attribute as unknown, not as a match", () => {
    const titan = search("titan 32gb ram 512gb ssd").results[0]!;
    expect(titan.class).toBe("near");
    expect(titan.variantIds).not.toContain("fx-titan:16-fx2-32-unknown");
  });

  it("is accent and case insensitive", () => {
    expect(search("ĐIỆN THOẠI nova 5 128gb")).toEqual(search("dien thoai nova 5 128gb"));
  });

  it("is deterministic and does not mutate the catalog", () => {
    const before = JSON.stringify(catalog);
    expect(search("aero 13 inch 16gb 512gb")).toEqual(search("aero 13 inch 16gb 512gb"));
    expect(JSON.stringify(catalog)).toBe(before);
  });

  it("does not treat network generations as memory (P-6)", () => {
    expect(search("nova 5g 128gb").status).toBe("no_match");
    expect(search("nova 4g 128gb").status).toBe("no_match");
  });

  it("tolerates one edit in a long token but not two", () => {
    expect(search("aeroo").results[0]?.productId).toBe("fx-aero");
    expect(search("aerooo").status).toBe("no_match");
  });

  it("without a chip vocabulary a chip-like word is only text", () => {
    expect(searchCatalog(catalog.products, "aero fx2", BASE_VOCABULARY).status).toBe("no_match");
  });
});
