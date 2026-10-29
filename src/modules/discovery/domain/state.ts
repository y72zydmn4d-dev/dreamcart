import { CATEGORIES, type Category } from "@/modules/catalog";
import { SORT_KEYS, type DiscoveryState, type SortKey } from "./discovery";
import {
  EMPTY_FILTERS,
  filtersFor,
  PRICE_BUCKETS,
  type FilterState,
  type PriceBucketKey,
} from "./facets";

/**
 * URL <-> discovery state. The URL is untrusted input: every parameter is checked against what the catalog
 * filters allow, unknown or malformed values are dropped (never echoed), and lengths are capped.
 */
export const EMPTY_DISCOVERY: DiscoveryState = { q: "", filters: EMPTY_FILTERS, sort: "relevance" };

const VALUE = /^[a-z0-9_.-]{1,40}$/;
const MAX_QUERY = 80;
const MAX_VALUES_PER_FILTER = 12;

type Params = { get(name: string): string | null; getAll(name: string): string[] };

export function parseDiscoveryState(params: Params): DiscoveryState {
  const q = (params.get("q") ?? "").slice(0, MAX_QUERY).replace(/\s+/g, " ").trim();
  const categoryParam = params.get("category");
  const category = CATEGORIES.includes(categoryParam as Category)
    ? (categoryParam as Category)
    : null;
  const sortParam = params.get("sort");
  const sort: SortKey = SORT_KEYS.includes(sortParam as SortKey)
    ? (sortParam as SortKey)
    : "relevance";
  const priceParam = params.get("price");
  const price = PRICE_BUCKETS.some((b) => b.key === priceParam)
    ? (priceParam as PriceBucketKey)
    : null;

  const selected: Record<string, (string | number)[]> = {};
  for (const def of filtersFor(category)) {
    const raw = params
      .getAll(def.key)
      .filter((v) => VALUE.test(v))
      .slice(0, MAX_VALUES_PER_FILTER);
    if (raw.length === 0) continue;
    // numeric attributes round-trip as numbers
    const numeric =
      def.source === "attribute" && ["screen_in", "ram_gb", "storage_gb"].includes(def.key);
    const values: (string | number)[] = numeric
      ? raw.filter((v) => /^\d+(\.\d+)?$/.test(v)).map(Number)
      : raw;
    if (values.length > 0) selected[def.key] = [...new Set(values)];
  }
  return { q, filters: { category, selected, price }, sort };
}

/** Serialize to a stable query string (empty for the default state). Values are written, never executed. */
export function serializeDiscoveryState(state: DiscoveryState): string {
  const out = new URLSearchParams();
  if (state.q) out.set("q", state.q);
  if (state.filters.category) out.set("category", state.filters.category);
  for (const def of filtersFor(state.filters.category)) {
    for (const value of state.filters.selected[def.key] ?? []) out.append(def.key, String(value));
  }
  if (state.filters.price) out.set("price", state.filters.price);
  if (state.sort !== "relevance") out.set("sort", state.sort);
  return out.toString();
}

export function activeFilterCount(filters: FilterState): number {
  return (
    Object.values(filters.selected).reduce((n, v) => n + v.length, 0) + (filters.price ? 1 : 0)
  );
}
