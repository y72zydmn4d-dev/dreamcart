/**
 * Prototype search over the synthetic catalog (Phase 2). Deliberately simple: diacritic-insensitive
 * prefix matching plus variant-level filters. The exact-variant engine in docs/SEARCH_FIXTURES.md is
 * built in Phase 3/5; this module exists only so the discovery UI can be evaluated with real
 * interactions. Nothing here invents popularity, ratings, or sales signals.
 */
import { tokenize } from "@/modules/shared/domain/text";
import {
  CATEGORIES,
  type AttributeKey,
  type Category,
  type PrototypeProduct,
  type PrototypeVariant,
} from "./catalog";

export type SortKey = "relevance" | "price-asc" | "price-desc" | "name";
export const SORT_KEYS: readonly SortKey[] = ["relevance", "price-asc", "price-desc", "name"];

export type PriceBucket = "under20" | "20to30" | "30to40" | "over40";
export const PRICE_BUCKETS: Readonly<Record<PriceBucket, readonly [number, number]>> = {
  under20: [0, 20_000_000],
  "20to30": [20_000_000, 30_000_000],
  "30to40": [30_000_000, 40_000_000],
  over40: [40_000_000, Number.MAX_SAFE_INTEGER],
};
const BUCKET_KEYS = Object.keys(PRICE_BUCKETS) as PriceBucket[];

/** Category-specific filter groups shown once a category is chosen. */
export const FILTER_GROUPS: Readonly<Record<Category, readonly AttributeKey[]>> = {
  laptop: ["screen_in", "ram_gb", "storage_gb"],
  phone: ["storage_gb", "color"],
  audio: ["type", "color"],
};
const FILTER_KEYS = [...new Set(Object.values(FILTER_GROUPS).flat())];

export interface SearchState {
  readonly q: string;
  readonly category: Category | null;
  readonly filters: Readonly<Partial<Record<AttributeKey, readonly string[]>>>;
  readonly price: PriceBucket | null;
  readonly sort: SortKey;
}

export const EMPTY_STATE: SearchState = {
  q: "",
  category: null,
  filters: {},
  price: null,
  sort: "relevance",
};

export interface SearchResult {
  readonly product: PrototypeProduct;
  readonly matchingVariants: readonly PrototypeVariant[];
  readonly fromPriceMinor: number;
  readonly toPriceMinor: number;
}

const CATEGORY_ALIASES: Readonly<Record<Category, string>> = {
  laptop: "laptop may tinh notebook",
  phone: "dien thoai smartphone phone",
  audio: "tai nghe am thanh headphone earbuds",
};

const VALUE_PATTERN = /^[a-z0-9_]{1,24}$/;
const MAX_QUERY_LENGTH = 80;

/** Parse untrusted URL parameters into a valid state; anything unknown is dropped. */
export function parseSearchState(params: URLSearchParams): SearchState {
  const category = params.get("category");
  const sort = params.get("sort");
  const price = params.get("price");
  const filters: Partial<Record<AttributeKey, string[]>> = {};
  for (const key of FILTER_KEYS) {
    const values = (params.get(key) ?? "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter((v) => VALUE_PATTERN.test(v));
    if (values.length > 0) filters[key] = [...new Set(values)];
  }
  return {
    q: (params.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH),
    category: CATEGORIES.includes(category as Category) ? (category as Category) : null,
    filters,
    price: BUCKET_KEYS.includes(price as PriceBucket) ? (price as PriceBucket) : null,
    sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : "relevance",
  };
}

/** Deterministic query string; defaults are omitted so URLs stay short and shareable. */
export function serializeSearchState(state: SearchState): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.category) params.set("category", state.category);
  for (const key of FILTER_KEYS) {
    const values = state.filters[key];
    if (values && values.length > 0) params.set(key, values.join(","));
  }
  if (state.price) params.set("price", state.price);
  if (state.sort !== "relevance") params.set("sort", state.sort);
  return params.toString();
}

function productTokens(product: PrototypeProduct): string[] {
  return tokenize(`${product.brand} ${product.name} ${CATEGORY_ALIASES[product.category]}`);
}

/** Every query token must prefix-match a product token. Returns matched-token count, or -1. */
function textScore(product: PrototypeProduct, queryTokens: readonly string[]): number {
  if (queryTokens.length === 0) return 0;
  const tokens = productTokens(product);
  const nameTokens = new Set(tokenize(product.name));
  let score = 0;
  for (const q of queryTokens) {
    const hit = tokens.find((t) => t.startsWith(q));
    if (!hit) return -1;
    if (nameTokens.has(hit)) score += 2;
    else score += 1;
  }
  return score;
}

function variantMatches(variant: PrototypeVariant, filters: SearchState["filters"]): boolean {
  return Object.entries(filters).every(([key, values]) => {
    if (!values || values.length === 0) return true;
    const value = variant.attributes[key as AttributeKey];
    return value !== undefined && values.includes(String(value));
  });
}

function evaluate(
  products: readonly PrototypeProduct[],
  state: SearchState,
): { result: SearchResult; score: number; index: number }[] {
  const queryTokens = tokenize(state.q);
  const out: { result: SearchResult; score: number; index: number }[] = [];
  products.forEach((product, index) => {
    if (state.category && product.category !== state.category) return;
    const score = textScore(product, queryTokens);
    if (score < 0) return;
    const matchingVariants = product.variants.filter((v) => variantMatches(v, state.filters));
    if (matchingVariants.length === 0) return;
    const prices = matchingVariants.map((v) => v.samplePriceMinor);
    const fromPriceMinor = Math.min(...prices);
    if (state.price) {
      const [min, max] = PRICE_BUCKETS[state.price];
      if (fromPriceMinor < min || fromPriceMinor >= max) return;
    }
    out.push({
      result: { product, matchingVariants, fromPriceMinor, toPriceMinor: Math.max(...prices) },
      score,
      index,
    });
  });
  return out;
}

export function runSearch(
  products: readonly PrototypeProduct[],
  state: SearchState,
): SearchResult[] {
  const rows = evaluate(products, state);
  const byName = (a: SearchResult, b: SearchResult) =>
    a.product.name.localeCompare(b.product.name, "vi");
  rows.sort((a, b) => {
    switch (state.sort) {
      case "price-asc":
        return a.result.fromPriceMinor - b.result.fromPriceMinor || byName(a.result, b.result);
      case "price-desc":
        return b.result.fromPriceMinor - a.result.fromPriceMinor || byName(a.result, b.result);
      case "name":
        return byName(a.result, b.result);
      default:
        // Relevance: text match strength, then the curated catalog order. No popularity signal.
        return b.score - a.score || a.index - b.index;
    }
  });
  return rows.map((r) => r.result);
}

/** How many products each value of `key` would yield, holding every other part of the state. */
export function facetCounts(
  products: readonly PrototypeProduct[],
  state: SearchState,
  key: AttributeKey,
  values: readonly string[],
): Record<string, number> {
  const others = { ...state.filters };
  delete others[key];
  return Object.fromEntries(
    values.map((value) => [
      value,
      evaluate(products, { ...state, filters: { ...others, [key]: [value] } }).length,
    ]),
  );
}

export function categoryCounts(
  products: readonly PrototypeProduct[],
  state: SearchState,
): Record<Category | "all", number> {
  const base = { ...state, filters: {}, category: null };
  const rows = evaluate(products, base);
  const counts = { all: rows.length, laptop: 0, phone: 0, audio: 0 };
  for (const row of rows) counts[row.result.product.category]++;
  return counts;
}

/** Values offered for a filter group within a category, in catalog order. */
export function filterValues(
  products: readonly PrototypeProduct[],
  category: Category,
  key: AttributeKey,
): string[] {
  const seen: string[] = [];
  for (const product of products) {
    if (product.category !== category) continue;
    for (const variant of product.variants) {
      const value = variant.attributes[key];
      if (value !== undefined && !seen.includes(String(value))) seen.push(String(value));
    }
  }
  return seen.every((v) => /^\d+$/.test(v)) ? seen.sort((a, b) => Number(a) - Number(b)) : seen;
}

export type Suggestion =
  | { readonly kind: "category"; readonly category: Category }
  | { readonly kind: "product"; readonly product: PrototypeProduct };

/** Autocomplete from what exists in the catalog only. */
export function suggest(products: readonly PrototypeProduct[], q: string, limit = 6): Suggestion[] {
  const tokens = tokenize(q);
  if (tokens.length === 0) return [];
  const categories = CATEGORIES.filter((c) =>
    tokens.every((t) => tokenize(CATEGORY_ALIASES[c]).some((a) => a.startsWith(t))),
  ).map((category): Suggestion => ({ kind: "category", category }));
  const items = runSearch(products, { ...EMPTY_STATE, q }).map((r): Suggestion => ({
    kind: "product",
    product: r.product,
  }));
  return [...categories, ...items].slice(0, limit);
}

export function activeFilterCount(state: SearchState): number {
  return (
    Object.values(state.filters).reduce((n, v) => n + (v?.length ?? 0), 0) + (state.price ? 1 : 0)
  );
}
