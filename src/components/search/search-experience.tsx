"use client";

import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { attributeLabel, formatAttribute } from "@/components/product/attribute-format";
import { ProductCard } from "@/components/product/product-card";
import { FixtureNotice } from "@/components/prototype/fixture-notice";
import { Button } from "@/components/ui/button";
import { CloseIcon, FilterIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { t } from "@/platform/i18n";
import {
  CATEGORIES,
  PROTOTYPE_PRODUCTS,
  type AttributeKey,
  type Category,
} from "@/prototype/catalog";
import {
  EMPTY_STATE,
  SORT_KEYS,
  activeFilterCount,
  categoryCounts,
  parseSearchState,
  runSearch,
  serializeSearchState,
  type SearchState,
  type SortKey,
} from "@/prototype/search";
import { FilterPanel } from "./filter-panel";
import { ResultsSkeleton } from "./results-skeleton";
import { SearchBox } from "./search-box";

const SORT_LABEL_KEYS = {
  relevance: "search.sort.relevance",
  "price-asc": "search.sort.priceAsc",
  "price-desc": "search.sort.priceDesc",
  name: "search.sort.name",
} as const satisfies Record<SortKey, string>;

/**
 * Search results driven entirely by the URL, so every state is shareable and the back button works.
 * `?demo=loading` and `?demo=error` render those states for design review (prototype only).
 */
export function SearchExperience() {
  const router = useRouter();
  const params = useSearchParams();
  const urlState = useMemo(
    () => parseSearchState(new URLSearchParams(params.toString())),
    [params],
  );
  // Local state answers clicks immediately (a checkbox must never snap back while the URL updates);
  // the URL stays the source of truth and re-syncs on back/forward and link navigation.
  const [state, setState] = useState(urlState);
  const [syncedFrom, setSyncedFrom] = useState(urlState);
  if (syncedFrom !== urlState) {
    setSyncedFrom(urlState);
    setState(urlState);
  }
  const [, startTransition] = useTransition();
  const demo = params.get("demo");
  const results = useMemo(() => runSearch(PROTOTYPE_PRODUCTS, state), [state]);
  const counts = useMemo(() => categoryCounts(PROTOTYPE_PRODUCTS, state), [state]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterCount = activeFilterCount(state);

  const update = (next: SearchState) => {
    setState(next);
    const qs = serializeSearchState(next);
    startTransition(() =>
      router.replace((qs ? `/search?${qs}` : "/search") as Route, { scroll: false }),
    );
  };

  const setCategory = (category: Category | null) =>
    // Category-specific filters do not carry over to another category.
    update({ ...state, category, filters: {} });

  const chips: { label: string; remove: () => void }[] = [
    ...Object.entries(state.filters).flatMap(([key, values]) =>
      (values ?? []).map((value) => ({
        label: `${attributeLabel(key as AttributeKey)}: ${formatAttribute(key as AttributeKey, value)}`,
        remove: () =>
          update({
            ...state,
            filters: { ...state.filters, [key]: (values ?? []).filter((v) => v !== value) },
          }),
      })),
    ),
    ...(state.price
      ? [
          {
            label: t(`search.price.${state.price}`),
            remove: () => update({ ...state, price: null }),
          },
        ]
      : []),
  ];

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
            {t("search.resultsCount", { count: results.length })}
          </p>
        </div>
        <SearchBox key={state.q} defaultValue={state.q} className="max-w-2xl" />
        <FixtureNotice />

        <nav aria-label={t("search.filters.category")} className="-mx-1 overflow-x-auto px-1">
          <ul className="flex gap-2 pb-1">
            {[null, ...CATEGORIES].map((category) => {
              const active = state.category === category;
              const count = counts[category ?? "all"];
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
                    <span className={active ? "opacity-80" : "text-muted-foreground"}>{count}</span>
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
          <FilterPanel state={state} onChange={update} />
        </aside>

        <section aria-label={t("search.resultsCount", { count: results.length })}>
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
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-2 pl-3 text-sm text-accent-soft-foreground"
                >
                  {chip.label}
                  <CloseIcon size={14} />
                </button>
              ))}
              <button
                type="button"
                onClick={() => update({ ...state, filters: {}, price: null })}
                className="min-h-9 cursor-pointer rounded-full px-3 text-sm underline underline-offset-2"
              >
                {t("search.filters.clear")}
              </button>
            </div>
          ) : null}

          {demo === "loading" ? (
            <ResultsSkeleton />
          ) : demo === "error" ? (
            <div
              role="alert"
              className="rounded-xl border border-border bg-surface p-8 text-center"
            >
              <h2 className="text-lg font-semibold">{t("search.error.title")}</h2>
              <p className="mt-2 text-muted-foreground">{t("search.error.body")}</p>
              <Button className="mt-5" onClick={() => update(state)}>
                {t("search.error.retry")}
              </Button>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center">
              <h2 className="text-lg font-semibold">{t("search.empty.title")}</h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                {t("search.empty.body")}
              </p>
              <Button variant="outline" className="mt-5" onClick={() => update(EMPTY_STATE)}>
                {t("search.empty.reset")}
              </Button>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((r) => (
                <li key={r.product.id}>
                  <ProductCard
                    product={r.product}
                    variants={r.matchingVariants}
                    headingLevel="h2"
                  />
                </li>
              ))}
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
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => update({ ...state, filters: {}, price: null })}
            >
              {t("search.filters.clear")}
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              {t("search.filters.apply", { count: results.length })}
            </Button>
          </div>
        }
      >
        <FilterPanel state={state} onChange={update} />
      </Sheet>
    </div>
  );
}
