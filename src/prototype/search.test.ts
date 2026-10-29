import { describe, expect, it } from "vitest";
import { PROTOTYPE_PRODUCTS } from "./catalog";
import {
  EMPTY_STATE,
  activeFilterCount,
  categoryCounts,
  facetCounts,
  filterValues,
  parseSearchState,
  runSearch,
  serializeSearchState,
  suggest,
} from "./search";

const ids = (state = EMPTY_STATE) => runSearch(PROTOTYPE_PRODUCTS, state).map((r) => r.product.id);

describe("prototype catalog integrity", () => {
  it("is clearly synthetic: fictional brand and reserved fx- ids everywhere", () => {
    for (const p of PROTOTYPE_PRODUCTS) {
      expect(p.brand).toBe("Fixturia");
      expect(p.id.startsWith("fx-")).toBe(true);
      for (const v of p.variants) expect(v.id.startsWith(`${p.id}:`)).toBe(true);
    }
  });

  it("has unique ids, integer VND prices, and every configurator group set on every variant", () => {
    const all = PROTOTYPE_PRODUCTS.flatMap((p) => [p.id, ...p.variants.map((v) => v.id)]);
    expect(new Set(all).size).toBe(all.length);
    for (const p of PROTOTYPE_PRODUCTS) {
      for (const v of p.variants) {
        expect(Number.isSafeInteger(v.samplePriceMinor) && v.samplePriceMinor > 0).toBe(true);
        for (const g of p.groups) expect(v.attributes[g], `${v.id}.${g}`).toBeDefined();
      }
      const keys = p.variants.map((v) => p.groups.map((g) => v.attributes[g]).join("|"));
      expect(new Set(keys).size, `${p.id} duplicate configuration`).toBe(keys.length);
    }
  });
});

describe("runSearch", () => {
  it("matches without diacritics and by prefix", () => {
    expect(ids({ ...EMPTY_STATE, q: "điện thoại" })).toEqual(
      ids({ ...EMPTY_STATE, q: "dien thoai" }),
    );
    expect(ids({ ...EMPTY_STATE, q: "nov" })).toEqual(["fx-nova", "fx-nova-mini"]);
  });

  it("requires every query token and returns nothing for unknown text", () => {
    expect(ids({ ...EMPTY_STATE, q: "nova mini" })).toEqual(["fx-nova-mini"]);
    expect(ids({ ...EMPTY_STATE, q: "zzz" })).toEqual([]);
  });

  it("filters at variant level and reports the price range of matching variants only", () => {
    const [aero] = runSearch(PROTOTYPE_PRODUCTS, {
      ...EMPTY_STATE,
      category: "laptop",
      filters: { screen_in: ["15"] },
    });
    expect(aero?.product.id).toBe("fx-aero");
    expect(aero?.matchingVariants.map((v) => v.id)).toEqual([
      "fx-aero:15-fx2-16-512",
      "fx-aero:15-fx2-32-1024",
    ]);
    expect([aero?.fromPriceMinor, aero?.toPriceMinor]).toEqual([37990000, 47990000]);
  });

  it("does not show a product when no single variant satisfies all filters", () => {
    // Nova 5 has 512 GB (graphite only) and sand (256 GB only), never together.
    expect(
      ids({ ...EMPTY_STATE, category: "phone", filters: { storage_gb: ["512"], color: ["sand"] } }),
    ).toEqual([]);
  });

  it("sorts by sample price and by name", () => {
    const asc = runSearch(PROTOTYPE_PRODUCTS, { ...EMPTY_STATE, sort: "price-asc" }).map(
      (r) => r.fromPriceMinor,
    );
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = runSearch(PROTOTYPE_PRODUCTS, { ...EMPTY_STATE, sort: "price-desc" }).map(
      (r) => r.fromPriceMinor,
    );
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    const names = runSearch(PROTOTYPE_PRODUCTS, { ...EMPTY_STATE, sort: "name" }).map(
      (r) => r.product.name,
    );
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "vi")));
  });

  it("applies the price bucket to the from-price", () => {
    const rows = runSearch(PROTOTYPE_PRODUCTS, { ...EMPTY_STATE, price: "under20" });
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.fromPriceMinor).toBeLessThan(20_000_000);
  });
});

describe("counts and suggestions", () => {
  it("counts categories for the current query", () => {
    expect(categoryCounts(PROTOTYPE_PRODUCTS, { ...EMPTY_STATE, q: "fixturia" })).toEqual({
      all: 8,
      laptop: 2,
      phone: 3,
      audio: 3,
    });
  });

  it("counts each facet value while holding the other filters", () => {
    const state = { ...EMPTY_STATE, category: "phone" as const, filters: { color: ["sand"] } };
    expect(facetCounts(PROTOTYPE_PRODUCTS, state, "storage_gb", ["128", "256", "512"])).toEqual({
      "128": 0,
      "256": 1,
      "512": 0,
    });
  });

  it("lists filter values in a stable order", () => {
    expect(filterValues(PROTOTYPE_PRODUCTS, "phone", "storage_gb")).toEqual(["128", "256", "512"]);
    expect(filterValues(PROTOTYPE_PRODUCTS, "audio", "type")).toEqual(["earbuds", "over_ear"]);
  });

  it("suggests only what exists, categories first", () => {
    const s = suggest(PROTOTYPE_PRODUCTS, "tai");
    expect(s[0]).toEqual({ kind: "category", category: "audio" });
    expect(suggest(PROTOTYPE_PRODUCTS, "qqq")).toEqual([]);
    expect(suggest(PROTOTYPE_PRODUCTS, "")).toEqual([]);
  });
});

describe("URL state", () => {
  it("round-trips a full state", () => {
    const state = {
      q: "aero",
      category: "laptop" as const,
      filters: { ram_gb: ["16", "32"], storage_gb: ["512"] },
      price: "30to40" as const,
      sort: "price-asc" as const,
    };
    const parsed = parseSearchState(new URLSearchParams(serializeSearchState(state)));
    expect(parsed).toEqual(state);
    expect(activeFilterCount(parsed)).toBe(4);
  });

  it("drops anything unknown or malformed from untrusted parameters", () => {
    const parsed = parseSearchState(
      new URLSearchParams(
        "category=cars&sort=popular&price=free&color=<script>,black&ram_gb=16&evil=1",
      ),
    );
    expect(parsed).toEqual({ ...EMPTY_STATE, filters: { color: ["black"], ram_gb: ["16"] } });
    expect(parseSearchState(new URLSearchParams(`q=${"x".repeat(200)}`)).q).toHaveLength(80);
  });

  it("omits defaults so the base URL stays clean", () => {
    expect(serializeSearchState(EMPTY_STATE)).toBe("");
  });
});
