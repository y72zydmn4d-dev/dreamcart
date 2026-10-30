import type { Category } from "@/modules/catalog";
import type { ProductView, VariantView } from "./catalog-view";

/**
 * Category-specific filters (docs/PRD.md J1, Phase 5 §5.7). A filter exists only if the data has it with at least
 * two distinct values; connectivity and noise cancellation are not catalog attributes yet, so they are not offered.
 * Within one filter selected values are OR; across filters they are AND. Attribute and price filters are
 * variant-level: one single variant must satisfy all of them together (never a mix of different variants).
 */

export type FilterKind = "product" | "variant";
export interface FilterDefinition {
  readonly key: string;
  readonly kind: FilterKind;
  /** Where the value comes from. */
  /** `compatibility`: a product-level, multi-valued filter over the host device families a product works with. */
  readonly source: "brand" | "family" | "attribute" | "compatibility";
}

export const FILTER_DEFINITIONS: Readonly<Record<Category, readonly FilterDefinition[]>> = {
  laptop: [
    { key: "brand", kind: "product", source: "brand" },
    { key: "chip", kind: "variant", source: "attribute" },
    { key: "ram_gb", kind: "variant", source: "attribute" },
    { key: "storage_gb", kind: "variant", source: "attribute" },
    { key: "screen_in", kind: "variant", source: "attribute" },
  ],
  desktop: [
    { key: "brand", kind: "product", source: "brand" },
    { key: "chip", kind: "variant", source: "attribute" },
    { key: "ram_gb", kind: "variant", source: "attribute" },
    { key: "storage_gb", kind: "variant", source: "attribute" },
  ],
  display: [
    { key: "brand", kind: "product", source: "brand" },
    { key: "screen_in", kind: "variant", source: "attribute" },
    { key: "resolution", kind: "variant", source: "attribute" },
    { key: "glass", kind: "variant", source: "attribute" },
    { key: "stand", kind: "variant", source: "attribute" },
  ],
  tablet: [
    { key: "brand", kind: "product", source: "brand" },
    { key: "screen_in", kind: "variant", source: "attribute" },
    { key: "storage_gb", kind: "variant", source: "attribute" },
    { key: "connectivity", kind: "variant", source: "attribute" },
    { key: "color", kind: "variant", source: "attribute" },
    { key: "chip", kind: "variant", source: "attribute" },
  ],
  wearable: [
    { key: "brand", kind: "product", source: "brand" },
    { key: "case_mm", kind: "variant", source: "attribute" },
    { key: "case_material", kind: "variant", source: "attribute" },
    { key: "connectivity", kind: "variant", source: "attribute" },
    { key: "band_type", kind: "variant", source: "attribute" },
  ],
  smart_home: [
    { key: "brand", kind: "product", source: "brand" },
    { key: "device_type", kind: "variant", source: "attribute" },
    { key: "color", kind: "variant", source: "attribute" },
  ],
  accessory: [
    { key: "brand", kind: "product", source: "brand" },
    { key: "accessory_type", kind: "variant", source: "attribute" },
    { key: "compatibility", kind: "product", source: "compatibility" },
    { key: "color", kind: "variant", source: "attribute" },
    { key: "connector", kind: "variant", source: "attribute" },
  ],
  phone: [
    { key: "brand", kind: "product", source: "brand" },
    { key: "family", kind: "product", source: "family" },
    { key: "storage_gb", kind: "variant", source: "attribute" },
    { key: "color", kind: "variant", source: "attribute" },
    { key: "chip", kind: "variant", source: "attribute" },
  ],
  audio: [
    { key: "brand", kind: "product", source: "brand" },
    { key: "type", kind: "variant", source: "attribute" },
    { key: "color", kind: "variant", source: "attribute" },
    { key: "noise_control", kind: "variant", source: "attribute" },
    { key: "connector", kind: "variant", source: "attribute" },
  ],
};
const ALL_CATEGORY_FILTERS: readonly FilterDefinition[] = [
  { key: "brand", kind: "product", source: "brand" },
];

export const filtersFor = (category: Category | null): readonly FilterDefinition[] =>
  category ? FILTER_DEFINITIONS[category] : ALL_CATEGORY_FILTERS;

/** Reference-price ranges in VND (exclusive upper bound). A range is offered only if some product falls in it. */
export const PRICE_BUCKETS = [
  { key: "under_10m", min: 0, max: 10_000_000 },
  { key: "from_10m", min: 10_000_000, max: 20_000_000 },
  { key: "from_20m", min: 20_000_000, max: 30_000_000 },
  { key: "from_30m", min: 30_000_000, max: 50_000_000 },
  { key: "from_50m", min: 50_000_000, max: Number.POSITIVE_INFINITY },
] as const;
export type PriceBucketKey = (typeof PRICE_BUCKETS)[number]["key"];

export interface FilterState {
  readonly category: Category | null;
  /** filter key -> selected values (strings or numbers, as stored). */
  readonly selected: Readonly<Record<string, readonly (string | number)[]>>;
  readonly price: PriceBucketKey | null;
}
export const EMPTY_FILTERS: FilterState = { category: null, selected: {}, price: null };

const bucketOf = (key: PriceBucketKey) => PRICE_BUCKETS.find((b) => b.key === key)!;

/** The values a product has for a product-level filter. Most have one; compatibility can have several. */
function productValues(p: ProductView, def: FilterDefinition): readonly string[] {
  switch (def.source) {
    case "brand":
      return [p.product.brand];
    case "family":
      return [p.product.family];
    case "compatibility":
      return [...new Set((p.product.compatibleWith ?? []).map((c) => c.family))];
    default:
      return [];
  }
}

/** True if this variant satisfies every active variant-level filter and the price range. */
export function variantMatches(
  v: VariantView,
  filters: FilterState,
  definitions: readonly FilterDefinition[],
  skip?: string,
): boolean {
  for (const def of definitions) {
    if (def.kind !== "variant" || def.key === skip) continue;
    const wanted = filters.selected[def.key];
    if (!wanted || wanted.length === 0) continue;
    const value = v.variant.attributes[def.key];
    if (value === undefined || !wanted.includes(value)) return false;
  }
  if (filters.price && skip !== "price") {
    const { min, max } = bucketOf(filters.price);
    const amount = v.best?.amountMinor;
    if (amount === undefined || amount < min || amount >= max) return false;
  }
  return true;
}

export function productMatches(p: ProductView, filters: FilterState, skip?: string): boolean {
  if (filters.category && p.product.category !== filters.category) return false;
  const definitions = filtersFor(filters.category);
  for (const def of definitions) {
    if (def.kind !== "product" || def.key === skip) continue;
    const wanted = filters.selected[def.key];
    if (!wanted || wanted.length === 0) continue;
    // Any one of the product's values may satisfy the filter (an accessory fitting several families).
    if (!productValues(p, def).some((value) => wanted.includes(value))) return false;
  }
  return true;
}

/** Variants of `p` that satisfy the filters (empty when the product itself is filtered out). */
export function matchingVariants(
  p: ProductView,
  filters: FilterState,
  skip?: string,
): VariantView[] {
  if (!productMatches(p, filters, skip)) return [];
  const definitions = filtersFor(filters.category);
  return p.variants.filter((v) => variantMatches(v, filters, definitions, skip));
}

export interface FacetValue {
  readonly value: string | number;
  readonly count: number;
  readonly selected: boolean;
  /** Zero results if chosen: shown but not selectable (counts stay visible). */
  readonly disabled: boolean;
}
export interface FacetGroup {
  readonly key: string;
  readonly values: readonly FacetValue[];
}
export interface PriceFacet {
  readonly key: PriceBucketKey;
  readonly count: number;
  readonly selected: boolean;
  readonly disabled: boolean;
}
export interface Facets {
  readonly groups: readonly FacetGroup[];
  readonly price: readonly PriceFacet[];
}

const compareValues = (a: string | number, b: string | number) =>
  typeof a === "number" && typeof b === "number" ? a - b : String(a) < String(b) ? -1 : 1;

/**
 * Facet counts for the products in `candidates` (already restricted by the text query). Each group is counted
 * with every OTHER filter applied, which is what makes "if I also choose this, how many remain" true.
 */
export function buildFacets(candidates: readonly ProductView[], filters: FilterState): Facets {
  const definitions = filtersFor(filters.category);
  const inScope = candidates.filter(
    (p) => !filters.category || p.product.category === filters.category,
  );

  const groups: FacetGroup[] = [];
  for (const def of definitions) {
    // Existence check on the whole scope: a filter with fewer than two distinct values is not offered.
    const distinct = new Set<string | number>();
    for (const p of inScope) {
      if (def.kind === "product") {
        for (const v of productValues(p, def)) distinct.add(v);
      } else
        for (const v of p.variants)
          if (v.variant.attributes[def.key] !== undefined)
            distinct.add(v.variant.attributes[def.key]!);
    }
    if (distinct.size < 2) continue;

    const counts = new Map<string | number, number>([...distinct].map((v) => [v, 0]));
    for (const p of inScope) {
      if (def.kind === "product") {
        if (!productMatches(p, filters, def.key)) continue;
        // other variant-level filters must still leave at least one variant
        if (matchingVariants(p, filters, def.key).length > 0)
          for (const v of productValues(p, def)) counts.set(v, counts.get(v)! + 1);
      } else {
        const vs = matchingVariants(p, filters, def.key);
        const seen = new Set<string | number>();
        for (const v of vs) {
          const value = v.variant.attributes[def.key];
          if (value !== undefined) seen.add(value);
        }
        for (const value of seen) counts.set(value, counts.get(value)! + 1);
      }
    }
    const selected = new Set(filters.selected[def.key] ?? []);
    groups.push({
      key: def.key,
      values: [...counts.entries()]
        .sort(([a], [b]) => compareValues(a, b))
        .map(([value, count]) => ({
          value,
          count,
          selected: selected.has(value),
          disabled: count === 0 && !selected.has(value),
        })),
    });
  }

  const price: PriceFacet[] = [];
  for (const bucket of PRICE_BUCKETS) {
    let count = 0;
    let existsAnywhere = false;
    for (const p of inScope) {
      if (
        p.variants.some(
          (v) => v.best && v.best.amountMinor >= bucket.min && v.best.amountMinor < bucket.max,
        )
      )
        existsAnywhere = true;
      if (
        matchingVariants(p, filters, "price").some(
          (v) => v.best && v.best.amountMinor >= bucket.min && v.best.amountMinor < bucket.max,
        )
      )
        count++;
    }
    if (!existsAnywhere) continue; // no data for this range: not offered
    const selected = filters.price === bucket.key;
    price.push({ key: bucket.key, count, selected, disabled: count === 0 && !selected });
  }
  return { groups, price };
}
