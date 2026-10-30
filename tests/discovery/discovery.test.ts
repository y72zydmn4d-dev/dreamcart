import { beforeAll, describe, expect, it } from "vitest";
import {
  activeFilterCount,
  buildCatalogView,
  buildSearchVocabulary,
  discover,
  EMPTY_DISCOVERY,
  EMPTY_FILTERS,
  parseDiscoveryState,
  serializeDiscoveryState,
  suggest,
  valueLabelVi,
  type CatalogView,
  type DiscoveryState,
} from "@/modules/discovery";
import { loadActiveCatalog } from "@/platform/catalog";

/** Exercised on the synthetic catalog: it contains every price/offer situation the engine must handle. */
const NOW = Date.parse("2026-11-30T00:00:00Z");
let view: CatalogView;
let vocabulary: ReturnType<typeof buildSearchVocabulary>;
let vocab: Awaited<ReturnType<typeof loadActiveCatalog>>["catalog"]["vocabulary"];

beforeAll(async () => {
  const { catalog } = await loadActiveCatalog(NOW);
  view = buildCatalogView(catalog, NOW);
  vocabulary = buildSearchVocabulary(catalog);
  vocab = catalog.vocabulary;
});

const run = (over: Partial<DiscoveryState> & { q?: string } = {}) =>
  discover(
    view,
    { ...EMPTY_DISCOVERY, ...over, filters: { ...EMPTY_FILTERS, ...(over.filters ?? {}) } },
    vocabulary,
  );
const ids = (r: ReturnType<typeof run>) => r.items.map((i) => i.product.product.id);

describe("browsing", () => {
  it("lists every product by name when there is no query", () => {
    const r = run();
    expect(r.status).toBe("browse");
    expect(r.items).toHaveLength(8);
    expect(r.items.every((i) => i.class === "browse")).toBe(true);
    // categories without products (desktop, display) are counted as zero and never shown as tabs
    expect(r.categoryCounts).toEqual({ laptop: 2, desktop: 0, display: 0, phone: 3, audio: 3 });
  });
});

describe("text search keeps the exact-variant rules", () => {
  it("diacritic-insensitive category and attribute matching", () => {
    expect(ids(run({ q: "điện thoại nova 5 256gb" }))[0]).toBe("fx-nova");
    expect(ids(run({ q: "dien thoai nova 5 256gb" }))).toEqual(
      ids(run({ q: "điện thoại nova 5 256gb" })),
    );
  });
  it("an exact configuration returns only its variants, with a from-price for that selection", () => {
    const r = run({ q: "aero 13 inch 16gb 512gb fx2" });
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ class: "match" });
    expect(r.items[0]!.variants.map((v) => v.variant.id)).toEqual(["fx-aero:13-fx2-16-512"]);
    expect(r.items[0]!.startingPrice?.amountMinor).toBe(33_990_000);
  });
  it("never substitutes: an unavailable combination is a near match with reasons and no variants", () => {
    const r = run({ q: "aero 15 inch 8gb 256gb" });
    expect(r.items[0]).toMatchObject({ class: "near", reasons: ["combination_unavailable"] });
  });
  it("conflicting attributes are ambiguous, never resolved silently", () => {
    const r = run({ q: "aero 13 inch 15 inch" });
    expect(r.items[0]).toMatchObject({ class: "ambiguous", reasons: ["conflicting:screen_in"] });
  });
  it("safe shorthand: 256G is storage; 5G is not memory", () => {
    expect(
      run({ q: "nova 256g" }).items[0]!.variants.every(
        (v) => v.variant.attributes.storage_gb === 256,
      ),
    ).toBe(true);
    expect(run({ q: "nova 5g 128gb" }).status).toBe("no_match");
  });
  it("catalog vocabulary: a color alias from the catalog and a built-in Vietnamese color word", () => {
    expect(
      run({ q: "pulse trang" }).items[0]!.variants.map((v) => v.variant.attributes.color),
    ).toEqual(["white", "white"]);
    expect(run({ q: "buds den" }).items.length).toBeGreaterThan(0);
  });
  it("reports empty and too-broad queries and honest no-match", () => {
    expect(run({ q: "   " }).status).toBe("browse");
    expect(run({ q: "16gb 512gb" }).status).toBe("query_too_broad");
    const none = run({ q: "zzzzz" });
    expect(none.status).toBe("no_match");
    expect(none.items).toEqual([]);
  });
  it("orders exact matches before near ones", () => {
    const r = run({ q: "nova 256gb" });
    const classes = r.items.map((i) => i.class);
    expect(classes).toEqual(
      [...classes].sort(
        (a, b) =>
          ["match", "ambiguous", "near"].indexOf(a) - ["match", "ambiguous", "near"].indexOf(b),
      ),
    );
  });
});

describe("price honesty", () => {
  it("a starting price comes only from a verified offer that exists; unpriced products have none", () => {
    const lite = view.byId.get("fx-buds-lite")!;
    expect(lite.startingPrice).toBeNull();
    expect(lite.pricedVariantCount).toBe(0);
    const item = run({ q: "buds lite" }).items[0]!;
    expect(item.startingPrice).toBeNull();
  });
  it("the family card never claims one price for all configurations: it is the lowest of the shown variants", () => {
    const aero = run({ q: "aero" }).items[0]!;
    expect(aero.startingPrice?.amountMinor).toBe(24_990_000);
    expect(aero.variants.length).toBe(5);
    const big = run({ q: "aero 32gb ram 1tb ssd" }).items[0]!;
    expect(big.startingPrice?.amountMinor).toBe(47_990_000); // only the VND offer; the USD one is not used
  });
  it("a stale observation is flagged but still shown, and an unpriced configuration stays unpriced", () => {
    const nova = view.byId.get("fx-nova")!;
    const stale = nova.variants.find((v) => v.variant.id === "fx-nova:512-graphite")!;
    expect(stale.best).toMatchObject({ state: "STALE", amountMinor: 26_990_000 });
    const titan = view.byId.get("fx-titan")!;
    expect(titan.variants.some((v) => v.status === "unpriced")).toBe(true);
  });
  it("a non-VND offer is not used for a VND reference price", () => {
    const v = view.byId
      .get("fx-aero")!
      .variants.find((x) => x.variant.id === "fx-aero:15-fx2-32-1024")!;
    expect(v.best?.amountMinor).toBe(47_990_000);
    expect(v.offers.some((o) => o.offer.price?.currency === "USD")).toBe(true);
  });
});

describe("filters and facets", () => {
  const laptops = { category: "laptop" as const };
  it("only offers filters whose data exists with two or more values", () => {
    const f = run({ filters: { ...EMPTY_FILTERS, ...laptops } }).facets;
    expect(f.groups.map((g) => g.key)).toEqual(["chip", "ram_gb", "storage_gb", "screen_in"]); // one brand: no brand filter
    const phones = run({ filters: { ...EMPTY_FILTERS, category: "phone" } }).facets;
    expect(phones.groups.map((g) => g.key)).toEqual(["family", "storage_gb", "color"]);
    const audio = run({ filters: { ...EMPTY_FILTERS, category: "audio" } }).facets;
    expect(audio.groups.map((g) => g.key)).toEqual(["type", "color"]);
    expect(run().facets.groups).toEqual([]); // no category: brand has one value
  });
  it("counts are 'if I also choose this' and zero-result values are disabled", () => {
    const r = run({
      filters: { ...EMPTY_FILTERS, category: "laptop", selected: { screen_in: [13] } },
    });
    const ram = r.facets.groups.find((g) => g.key === "ram_gb")!;
    expect(ram.values.map((v) => [v.value, v.count, v.disabled])).toEqual([
      [8, 1, false],
      [16, 1, false],
      [32, 0, true],
      [64, 0, true],
    ]);
    expect(ids(r)).toEqual(["fx-aero"]);
  });
  it("attribute filters apply to one variant together, never a mix of variants", () => {
    // fx-aero has 13in+32GB nowhere, even though it has 13in and 32GB variants separately
    const r = run({
      filters: {
        ...EMPTY_FILTERS,
        category: "laptop",
        selected: { screen_in: [13], ram_gb: [32] },
      },
    });
    expect(r.items).toEqual([]);
    const ok = run({
      filters: {
        ...EMPTY_FILTERS,
        category: "laptop",
        selected: { screen_in: [15], ram_gb: [32] },
      },
    });
    expect(ids(ok)).toEqual(["fx-aero"]);
    expect(ok.items[0]!.variants.map((v) => v.variant.id)).toEqual(["fx-aero:15-fx2-32-1024"]);
  });
  it("OR within a filter, AND across filters", () => {
    const r = run({
      filters: {
        ...EMPTY_FILTERS,
        category: "phone",
        selected: { color: ["mint", "sand"], storage_gb: [256] },
      },
    });
    expect(r.items.flatMap((i) => i.variants.map((v) => v.variant.id)).sort()).toEqual([
      "fx-nova:256-sand",
      "fx-pulse:256-mint",
    ]);
  });
  it("price ranges use reference prices; unpriced products never match a price filter", () => {
    const r = run({ filters: { ...EMPTY_FILTERS, price: "under_10m" } });
    expect(ids(r).sort()).toEqual(["fx-buds-pro", "fx-pulse", "fx-studio"].sort());
    expect(r.items.every((i) => i.product.product.id !== "fx-buds-lite")).toBe(true);
    const offered = run().facets.price.map((p) => p.key);
    expect(offered).toEqual(["under_10m", "from_10m", "from_20m", "from_30m", "from_50m"]);
  });
  it("price ranges are counted with the other filters applied; empty ranges stay visible but disabled", () => {
    const r = run({
      filters: { ...EMPTY_FILTERS, category: "laptop", selected: { screen_in: [13] } },
    });
    const by = Object.fromEntries(r.facets.price.map((p) => [p.key, p]));
    expect(by.from_20m).toMatchObject({ count: 1, disabled: false });
    expect(by.from_50m).toMatchObject({ count: 0, disabled: true });
    expect(
      run({
        filters: {
          ...EMPTY_FILTERS,
          category: "laptop",
          selected: { screen_in: [13] },
          price: "from_50m",
        },
      }).facets.price.find((p) => p.key === "from_50m"),
    ).toMatchObject({ selected: true, disabled: false });
  });
  it("combines query, category and filters, and category counts ignore the category itself", () => {
    const r = run({
      q: "nova",
      filters: { ...EMPTY_FILTERS, category: "phone", selected: { storage_gb: [128] } },
    });
    expect(
      r.items.every((i) => i.variants.every((v) => v.variant.attributes.storage_gb === 128)),
    ).toBe(true);
    expect(r.categoryCounts).toMatchObject({ phone: 2, laptop: 0, audio: 0 });
  });
  it("a filter with no results gives an honest empty list, not a fallback", () => {
    const r = run({
      q: "aero",
      filters: { ...EMPTY_FILTERS, category: "laptop", price: "under_10m" },
    });
    expect(r.items).toEqual([]);
    expect(r.status).toBe("no_match");
  });
});

describe("sorting (no invented popularity)", () => {
  it("price ascending and descending, unpriced products always last", () => {
    const asc = ids(run({ sort: "price-asc" }));
    const desc = ids(run({ sort: "price-desc" }));
    expect(asc.at(-1)).toBe("fx-buds-lite");
    expect(desc.at(-1)).toBe("fx-buds-lite");
    expect(asc[0]).toBe("fx-buds-pro");
    expect(desc[0]).toBe("fx-titan");
  });
  it("name order uses Vietnamese collation; relevance keeps the search order", () => {
    const names = run({ sort: "name" }).items.map((i) => i.product.product.titleVi);
    expect(names).toEqual([...names].sort(new Intl.Collator("vi").compare));
    const rel = run({ q: "nova 256gb", sort: "relevance" });
    expect(rel.items[0]!.class).toBe("match");
  });
});

describe("suggestions come only from the catalog", () => {
  it("categories first, then products; nothing for short or unknown text", () => {
    expect(suggest(view, "dien", vocabulary)[0]).toEqual({ kind: "category", category: "phone" });
    expect(
      suggest(view, "nov", vocabulary).map((s) => s.kind === "product" && s.productId),
    ).toEqual(["fx-nova", "fx-nova-mini"]);
    expect(suggest(view, "n", vocabulary)).toEqual([]);
    expect(suggest(view, "thisisnotaproduct", vocabulary)).toEqual([]);
    expect(suggest(view, "a", vocabulary, 3)).toEqual([]);
  });
});

describe("labels", () => {
  it("returns the Vietnamese label for coded values and the raw value when none exists", () => {
    expect(valueLabelVi(vocab, "color", "graphite")).toBe("Xám than chì");
    expect(valueLabelVi(vocab, "color", "unknown_color")).toBe("unknown_color");
    expect(valueLabelVi(vocab, "ram_gb", 16)).toBe("16");
  });
});

describe("URL state is untrusted input", () => {
  const parse = (qs: string) => parseDiscoveryState(new URLSearchParams(qs));
  it("round-trips a valid state", () => {
    const state: DiscoveryState = {
      q: "nova 256gb",
      filters: {
        category: "phone",
        selected: { storage_gb: [256], color: ["black", "sand"] },
        price: "from_20m",
      },
      sort: "price-asc",
    };
    expect(parse(serializeDiscoveryState(state))).toEqual(state);
    expect(serializeDiscoveryState(EMPTY_DISCOVERY)).toBe("");
  });
  it("drops unknown categories, sorts, prices and malformed or foreign filter values", () => {
    const s = parse(
      "category=toaster&sort=popularity&price=free&color=black&storage_gb=abc&q=" + "x".repeat(200),
    );
    expect(s.filters).toEqual({ category: null, selected: {}, price: null });
    expect(s.sort).toBe("relevance");
    expect(s.q.length).toBe(80);
    const t = parse(
      "category=phone&color=<script>&color=black&storage_gb=1e9&storage_gb=128&screen_in=13",
    );
    expect(t.filters.selected).toEqual({ color: ["black"], storage_gb: [128] }); // screen_in is not a phone filter
  });
  it("counts active filters", () => {
    expect(
      activeFilterCount(parse("category=phone&color=black&color=white&price=from_10m").filters),
    ).toBe(3);
  });
});
