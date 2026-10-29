"use client";

import { attributeLabel, formatAttribute } from "@/components/product/attribute-format";
import { t } from "@/platform/i18n";
import { PROTOTYPE_PRODUCTS, type AttributeKey } from "@/prototype/catalog";
import {
  FILTER_GROUPS,
  PRICE_BUCKETS,
  facetCounts,
  filterValues,
  runSearch,
  type PriceBucket,
  type SearchState,
} from "@/prototype/search";

interface FilterPanelProps {
  readonly state: SearchState;
  readonly onChange: (next: SearchState) => void;
}

const BUCKETS = Object.keys(PRICE_BUCKETS) as PriceBucket[];

/**
 * Filters use native checkboxes and radios (keyboard and screen-reader support for free). A value
 * that would yield zero results is disabled rather than hidden, and its count is shown.
 */
export function FilterPanel({ state, onChange }: FilterPanelProps) {
  const toggle = (key: AttributeKey, value: string) => {
    const current = state.filters[key] ?? [];
    const nextValues = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...state, filters: { ...state.filters, [key]: nextValues } });
  };

  const priceCounts = Object.fromEntries(
    BUCKETS.map((b) => [b, runSearch(PROTOTYPE_PRODUCTS, { ...state, price: b }).length]),
  );

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t("search.filters.price")}</legend>
        <div className="flex flex-col gap-1">
          {[null, ...BUCKETS].map((bucket) => {
            const count = bucket ? (priceCounts[bucket] ?? 0) : undefined;
            const disabled = bucket !== null && count === 0 && state.price !== bucket;
            return (
              <label
                key={bucket ?? "any"}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted has-disabled:cursor-not-allowed has-disabled:text-muted-foreground has-disabled:hover:bg-transparent`}
              >
                <input
                  type="radio"
                  name="price"
                  className="size-4 accent-(--accent)"
                  checked={state.price === bucket}
                  disabled={disabled}
                  onChange={() => onChange({ ...state, price: bucket })}
                />
                <span className="flex-1">
                  {bucket ? t(`search.price.${bucket}`) : t("search.filters.all")}
                </span>
                {count !== undefined ? (
                  <span className="text-sm text-muted-foreground">{count}</span>
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      {state.category ? (
        FILTER_GROUPS[state.category].map((key) => {
          const values = filterValues(PROTOTYPE_PRODUCTS, state.category!, key);
          const counts = facetCounts(PROTOTYPE_PRODUCTS, state, key, values);
          return (
            <fieldset key={key}>
              <legend className="mb-2 text-sm font-semibold">{attributeLabel(key)}</legend>
              <div className="flex flex-col gap-1">
                {values.map((value) => {
                  const checked = state.filters[key]?.includes(value) ?? false;
                  const disabled = !checked && (counts[value] ?? 0) === 0;
                  return (
                    <label
                      key={value}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted has-disabled:cursor-not-allowed has-disabled:text-muted-foreground has-disabled:hover:bg-transparent"
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-(--accent)"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(key, value)}
                      />
                      <span className="flex-1">{formatAttribute(key, value)}</span>
                      <span className="text-sm text-muted-foreground">{counts[value] ?? 0}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })
      ) : (
        <p className="text-sm text-muted-foreground">{t("search.filters.hint")}</p>
      )}
    </div>
  );
}
