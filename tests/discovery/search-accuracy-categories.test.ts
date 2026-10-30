import { describe, expect, it } from "vitest";
import type { CatalogData } from "@/modules/catalog";
import {
  buildCatalogView,
  buildSearchVocabulary,
  discover,
  EMPTY_DISCOVERY,
  EMPTY_FILTERS,
} from "@/modules/discovery";
import { NOW, catalog, label, mustValidate, product, variant } from "../support/fictional-catalog";

/**
 * Search accuracy across the extended categories, on FICTIONAL records: a query is answered by exact variants of the
 * right category, an attribute the category does not have is a mismatch (never a loose guess), and an unmatched
 * query says so instead of returning something unrelated.
 */

const products = [
  product("tm-tab", "tablet", "Tab", "T1"),
  product("tm-watch", "wearable", "Watch", "W1"),
  product("tm-buds", "audio", "Buds", "B1"),
  product("tm-mon", "display", "Screen", "S1"),
];
const variants = [
  variant("tm-tab", "tablet", "128", { screen_in: 11, storage_gb: 128, connectivity: "wifi" }),
  variant("tm-tab", "tablet", "256", { screen_in: 11, storage_gb: 256, connectivity: "wifi" }),
  variant("tm-watch", "wearable", "41", { case_mm: 41, case_material: "aluminium" }),
  variant("tm-watch", "wearable", "45", { case_mm: 45, case_material: "aluminium" }),
  variant("tm-buds", "audio", "black", { type: "earbuds", color: "black" }),
  variant("tm-buds", "audio", "white", { type: "earbuds", color: "white" }),
  variant("tm-mon", "display", "27", { screen_in: 27, resolution: "5k" }),
];

function withVocabulary(d: CatalogData): CatalogData {
  const vocabulary: Record<string, Record<string, ReturnType<typeof label>>> = {};
  for (const v of d.variants)
    for (const [key, value] of Object.entries(v.attributes))
      if (typeof value === "string") (vocabulary[key] ??= {})[value] = label(value);
  return { ...d, vocabulary };
}
const c = mustValidate(withVocabulary(catalog(products, variants)));
const view = buildCatalogView(c, NOW);
const vocab = buildSearchVocabulary(c);
const search = (q: string) =>
  discover(view, { ...EMPTY_DISCOVERY, q, filters: EMPTY_FILTERS }, vocab);
const ids = (q: string) => search(q).items.map((i) => i.product.product.id);

describe("search across extended categories", () => {
  it("a category word returns only that category", () => {
    expect(ids("tai nghe")).toEqual(["tm-buds"]);
    expect(ids("man hinh")).toEqual(["tm-mon"]);
    expect(ids("may tinh bang")).toEqual(["tm-tab"]);
  });

  it("a color narrows to exactly the variants of that color", () => {
    const result = search("tai nghe white");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.variants.map((v) => v.variant.id)).toEqual(["tm-buds:white"]);
  });

  it("an attribute the category does not have is a mismatch, not a loose guess", () => {
    // Displays have no storage; a storage query must not return the monitor as if it matched.
    const hits = search("man hinh 256gb").items.filter((i) => i.class === "match");
    expect(hits).toHaveLength(0);
  });

  it("a storage query finds the tablet configuration and not the other categories", () => {
    const result = search("may tinh bang 256gb");
    expect(result.items.map((i) => i.product.product.id)).toEqual(["tm-tab"]);
    expect(result.items[0]!.variants.map((v) => v.variant.id)).toEqual(["tm-tab:256"]);
  });

  it("an unknown query returns nothing rather than something unrelated", () => {
    expect(search("zzzz qqqq").items).toHaveLength(0);
  });
});
