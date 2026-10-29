import { type Category, CATEGORIES } from "@/modules/catalog";
import {
  searchCatalog,
  type MatchClass,
  type SearchStatus,
  type SearchVocabulary,
} from "@/modules/search";
import { normalizeText } from "@/modules/shared/domain/text";
import type { CatalogView, ProductView, ReferencePrice, VariantView } from "./catalog-view";
import { buildFacets, filtersFor, matchingVariants, type Facets, type FilterState } from "./facets";
import { toSearchProducts } from "./vocabulary";

/**
 * The discovery engine: text search (exact-variant rules from Phase 3) combined with category filters, facets and
 * sorting over the real catalog. Nothing is ranked by popularity, rating or sales, because none of that exists.
 */

export const SORT_KEYS = ["relevance", "price-asc", "price-desc", "name"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface DiscoveryState {
  readonly q: string;
  readonly filters: FilterState;
  readonly sort: SortKey;
}

export type DiscoveryStatus = SearchStatus | "browse";

export interface DiscoveryItem {
  readonly product: ProductView;
  /** `browse` when there was no text query. `near` and `ambiguous` are "not an exact match" and say why. */
  readonly class: MatchClass | "browse";
  readonly reasons: readonly string[];
  /** The variants that satisfy the query and the filters (the exact variants for a `match`). */
  readonly variants: readonly VariantView[];
  /**
   * The lowest reference price among `variants`, or null. It is a "from" price for this selection only; it never
   * stands in for a configuration that has no verified offer.
   */
  readonly startingPrice: ReferencePrice | null;
}

export interface DiscoveryResult {
  readonly status: DiscoveryStatus;
  readonly items: readonly DiscoveryItem[];
  readonly facets: Facets;
  /** Products per category for the current query and filters, ignoring the category itself. */
  readonly categoryCounts: Readonly<Record<Category, number>>;
}

function cheapest(variants: readonly VariantView[]): ReferencePrice | null {
  let best: ReferencePrice | null = null;
  for (const v of variants)
    if (v.best && (!best || v.best.amountMinor < best.amountMinor)) best = v.best;
  return best;
}

const collator = new Intl.Collator("vi");
const nameOf = (item: DiscoveryItem) => item.product.product.titleVi;

function sortItems(items: DiscoveryItem[], sort: SortKey, browse: boolean): DiscoveryItem[] {
  const byName = (a: DiscoveryItem, b: DiscoveryItem) =>
    collator.compare(nameOf(a), nameOf(b)) ||
    (a.product.product.id < b.product.product.id ? -1 : 1);
  if (sort === "name" || (sort === "relevance" && browse)) return [...items].sort(byName);
  if (sort === "relevance") return items; // already in search order: class, coverage, id
  const direction = sort === "price-asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const pa = a.startingPrice?.amountMinor;
    const pb = b.startingPrice?.amountMinor;
    if (pa === undefined && pb === undefined) return byName(a, b);
    if (pa === undefined) return 1; // unpriced products always last
    if (pb === undefined) return -1;
    return (pa - pb) * direction || byName(a, b);
  });
}

export function discover(
  view: CatalogView,
  state: DiscoveryState,
  vocabulary: SearchVocabulary,
): DiscoveryResult {
  const text = normalizeText(state.q);
  const products = view.products;

  // 1. Text search narrows and classifies; no query browses everything.
  let status: DiscoveryStatus = "browse";
  let candidates: {
    product: ProductView;
    cls: MatchClass | "browse";
    reasons: readonly string[];
    exact: readonly string[] | null;
  }[];
  if (text === "") {
    candidates = products.map((product) => ({ product, cls: "browse", reasons: [], exact: null }));
  } else {
    const outcome = searchCatalog(toSearchProducts(view), state.q, vocabulary);
    status = outcome.status;
    const byId = view.byId;
    candidates = outcome.results.map((r) => ({
      product: byId.get(r.productId)!,
      cls: r.class,
      reasons: r.reasons,
      exact: r.class === "match" ? r.variantIds : null,
    }));
  }

  // 2. Filters, applied to the products the query kept. Facets are computed on the same set.
  const queryScope = candidates.map((c) => c.product);
  const items: DiscoveryItem[] = [];
  for (const c of candidates) {
    let variants = matchingVariants(c.product, state.filters);
    if (c.exact) variants = variants.filter((v) => c.exact!.includes(v.variant.id));
    if (variants.length === 0) continue;
    items.push({
      product: c.product,
      class: c.cls,
      reasons: c.reasons,
      variants,
      startingPrice: cheapest(variants),
    });
  }

  // 3. Category counts ignore the category filter itself so every tab shows what it would hold.
  const categoryCounts = Object.fromEntries(CATEGORIES.map((cat) => [cat, 0])) as Record<
    Category,
    number
  >;
  for (const c of candidates) {
    const filters: FilterState = {
      ...state.filters,
      category: c.product.product.category,
      selected: pruneFor(state.filters, c.product.product.category),
    };
    let variants = matchingVariants(c.product, filters);
    if (c.exact) variants = variants.filter((v) => c.exact!.includes(v.variant.id));
    if (variants.length > 0) categoryCounts[c.product.product.category] += 1;
  }

  const finalStatus: DiscoveryStatus =
    text !== "" && status === "results" && items.length === 0 ? "no_match" : status;
  return {
    status: finalStatus,
    items: sortItems(items, state.sort, text === ""),
    facets: buildFacets(queryScope, state.filters),
    categoryCounts,
  };
}

/** Keep only the selections that make sense for `category` (a tab switch drops filters of other categories). */
export function pruneFor(filters: FilterState, category: Category | null): FilterState["selected"] {
  const allowed = new Set(filtersFor(category).map((d) => d.key));
  return Object.fromEntries(Object.entries(filters.selected).filter(([key]) => allowed.has(key)));
}

export type Suggestion =
  | { readonly kind: "category"; readonly category: Category }
  | { readonly kind: "product"; readonly productId: string; readonly title: string };

/** Autocomplete: categories first, then products whose words start with every query word. Catalog data only. */
export function suggest(
  view: CatalogView,
  query: string,
  vocabulary: SearchVocabulary,
  limit = 6,
): Suggestion[] {
  const q = normalizeText(query);
  if (q.length < 2) return [];
  const out: Suggestion[] = [];
  for (const category of view.categories) {
    if (vocabulary.categoryAliases[category].some((alias) => alias.startsWith(q)))
      out.push({ kind: "category", category });
  }
  const words = q.split(" ").filter(Boolean);
  for (const p of view.products) {
    const tokens = normalizeText(
      `${p.product.brand} ${p.product.family} ${p.product.model} ${p.product.titleVi}`,
    )
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    if (words.every((w) => tokens.some((t) => t.startsWith(w))))
      out.push({ kind: "product", productId: p.product.id, title: p.product.titleVi });
  }
  return out.slice(0, limit);
}
