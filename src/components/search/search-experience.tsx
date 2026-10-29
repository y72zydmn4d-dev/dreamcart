"use client";

import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useCatalog } from "@/components/catalog/catalog-context";
import { attributeLabel, formatAttribute } from "@/components/product/attribute-format";
import { ProductCard } from "@/components/product/product-card";
import { FixtureNotice } from "@/components/prototype/fixture-notice";
import { Button } from "@/components/ui/button";
import { CloseIcon, FilterIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Category } from "@/modules/catalog";
import {
  EMPTY_DISCOVERY,
  EMPTY_FILTERS,
  SORT_KEYS,
  activeFilterCount,
  discover,
  parseDiscoveryState,
  pruneFor,
  serializeDiscoveryState,
  type DiscoveryState,
  type SortKey,
} from "@/modules/discovery";
import { t, type DictionaryKey } from "@/platform/i18n";
import { FilterPanel } from "./filter-panel";
import { SearchBox } from "./search-box";
import { EmptyResults } from "./search-states";

const SORT_LABEL_KEYS = {
  relevance: "search.sort.relevance",
  "price-asc": "search.sort.priceAsc",
  "price-desc": "search.sort.priceDesc",
  name: "search.sort.name",
} as const satisfies Record<SortKey, string>;

/**
 * Search results driven entirely by the URL, so every state is shareable and the back button works. Results come
 * from the discovery engine over the validated catalog; nothing is ranked by anything we do not have.
 */
export function SearchExperience() {
  const router = useRouter();
  const params = useSearchParams();
  const { view, vocabulary, synthetic } = useCatalog();
  const catalogVocabulary = view.catalog.vocabulary;
  const urlState = useMemo(
    () => parseDiscoveryState(new URLSearchParams(params.toString())),
    [params],
  );
  // Local state answers clicks immediately (a checkbox must never snap back while the URL updates);
  // the URL stays the source of truth and re-syncs on back/forward and link navigation.
  const [state, setState] = useState<DiscoveryState>(urlState);
  const [syncedFrom, setSyncedFrom] = useState(urlState);
  if (syncedFrom !== urlState) {
    setSyncedFrom(urlState);
    setState(urlState);
  }
  const [pending, startTransition] = useTransition();
  const result = useMemo(() => discover(view, state, vocabulary), [view, state, vocabulary]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterCount = activeFilterCount(state.filters);
  const totalAcrossCategories = Object.values(result.categoryCounts).reduce((a, b) => a + b, 0);

  const update = (next: DiscoveryState) => {
    setState(next);
    const qs = serializeDiscoveryState(next);
    startTransition(() =>
      router.replace((qs ? `/search?${qs}` : "/search") as Route, { scroll: false }),
    );
  };

  const setCategory = (category: Category | null) =>
    // Category-specific filters do not carry over to another category.
    update({
      ...state,
      filters: { ...state.filters, category, selected: pruneFor(state.filters, category) },
    });

  const clearFilters = () =>
    update({ ...state, filters: { ...EMPTY_FILTERS, category: state.filters.category } });

  const chips: { label: string; remove: () => void }[] = [
    ...Object.entries(state.filters.selected).flatMap(([key, values]) =>
      values.map((value) => ({
        label: `${attributeLabel(key)}: ${formatAttribute(key, value, catalogVocabulary)}`,
        remove: () =>
          update({
            ...state,
            filters: {
              ...state.filters,
              selected: { ...state.filters.selected, [key]: values.filter((v) => v !== value) },
            },
          }),
      })),
    ),
    ...(state.filters.price
      ? [
          {
            label: t(`search.price.${state.filters.price}` as DictionaryKey),
            remove: () => update({ ...state, filters: { ...state.filters, price: null } }),
          },
        ]
      : []),
  ];

  const count = result.items.length;
  const panel = (
    <FilterPanel
      facets={result.facets}
      filters={state.filters}
      vocabulary={catalogVocabulary}
      onChange={(filters) => update({ ...state, filters })}
    />
  );

  return (
    <div className="py-8 sm:py-10">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-headline font-semibold">
            {state.q ? (
              <>
                {t("pages.search.title")}{" "}
                <span className="text-muted-foreground">
                  {t("search.resultsFor", { q: state.q })}
                </span>
              </>
            ) : (
              t("pages.search.title")
            )}
          </h1>
          <p className="text-muted-foreground" aria-live="polite">
            {t("search.resultsCount", { count })}
          </p>
        </div>
        <SearchBox key={state.q} defaultValue={state.q} className="max-w-2xl" />
        {synthetic ? <FixtureNotice /> : null}

        <nav aria-label={t("search.filters.category")} className="-mx-1 overflow-x-auto px-1">
          <ul className="flex gap-2 pb-1">
            {[null, ...view.categories].map((category) => {
              const active = state.filters.category === category;
              const tabCount = category ? result.categoryCounts[category] : totalAcrossCategories;
              return (
                <li key={category ?? "all"}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(category)}
                    className={cn(
                      "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm whitespace-nowrap transition-colors",
                      active
                        ? "border-transparent bg-foreground text-background"
                        : "border-border bg-surface hover:border-border-strong",
                    )}
                  >
                    {category ? t(`categories.${category}.short`) : t("search.filters.all")}
                    <span className={active ? "opacity-80" : "text-muted-foreground"}>
                      {tabCount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block" aria-label={t("search.filters.title")}>
          <h2 className="mb-4 text-lg font-semibold">{t("search.filters.title")}</h2>
          {panel}
        </aside>

        <section aria-label={t("search.resultsCount", { count })} aria-busy={pending}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 lg:hidden"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
            >
              <FilterIcon size={18} />
              {filterCount > 0
                ? t("search.filters.openCount", { count: filterCount })
                : t("search.filters.title")}
            </Button>
            <label className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t("search.sortLabel")}</span>
              <select
                value={state.sort}
                onChange={(e) => update({ ...state, sort: e.target.value as SortKey })}
                className="min-h-11 cursor-pointer rounded-full border border-border-strong bg-surface px-3 text-sm"
              >
                {SORT_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(SORT_LABEL_KEYS[key])}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {chips.length > 0 ? (
            <div
              className="mb-5 flex flex-wrap items-center gap-2"
              aria-label={t("search.filters.active")}
              role="group"
            >
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={chip.remove}
                  aria-label={t("search.filters.remove", { label: chip.label })}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-3 pl-4 text-sm text-accent-soft-foreground"
                >
                  {chip.label}
                  <CloseIcon size={14} />
                </button>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-11 cursor-pointer rounded-full px-3 text-sm underline underline-offset-2"
              >
                {t("search.filters.clear")}
              </button>
            </div>
          ) : null}

          {count === 0 ? (
            <EmptyResults
              tooBroad={result.status === "query_too_broad"}
              onReset={() => update(EMPTY_DISCOVERY)}
            />
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((item) => {
                const swatchValue = item.variants.find(
                  (v) => typeof v.variant.attributes.color === "string",
                )?.variant.attributes.color;
                return (
                  <li key={item.product.product.id}>
                    <ProductCard
                      product={item.product}
                      variants={item.variants}
                      startingPrice={item.startingPrice}
                      matchClass={item.class}
                      reasons={item.reasons}
                      synthetic={synthetic}
                      color={
                        typeof swatchValue === "string"
                          ? catalogVocabulary.color?.[swatchValue]?.swatch
                          : undefined
                      }
                      headingLevel="h2"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t("search.filters.title")}
        closeLabel={t("search.filters.close")}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={clearFilters}>
              {t("search.filters.clear")}
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              {t("search.filters.apply", { count })}
            </Button>
          </div>
        }
      >
        {panel}
      </Sheet>
    </div>
  );
}
