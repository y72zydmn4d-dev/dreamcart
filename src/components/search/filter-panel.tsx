"use client";

import { attributeLabel, formatAttribute } from "@/components/product/attribute-format";
import type { Vocabulary } from "@/modules/catalog";
import type { Facets, FilterState, PriceBucketKey } from "@/modules/discovery";
import { t, type DictionaryKey } from "@/platform/i18n";

interface FilterPanelProps {
  readonly facets: Facets;
  readonly filters: FilterState;
  readonly vocabulary: Vocabulary;
  readonly onChange: (next: FilterState) => void;
}

const optionClass =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted has-disabled:cursor-not-allowed has-disabled:text-muted-foreground has-disabled:hover:bg-transparent";

/**
 * Filters use native checkboxes and radios (keyboard and screen-reader support for free). Only filters whose data
 * exists are offered, and a value that would yield zero results is disabled rather than hidden, with its count.
 */
export function FilterPanel({ facets, filters, vocabulary, onChange }: FilterPanelProps) {
  const toggle = (key: string, value: string | number) => {
    const current = filters.selected[key] ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onChange({ ...filters, selected: { ...filters.selected, [key]: next } });
  };
  const setPrice = (price: PriceBucketKey | null) => onChange({ ...filters, price });

  return (
    <div className="flex flex-col gap-6">
      {facets.price.length > 0 ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t("search.filters.price")}</legend>
          <div className="flex flex-col gap-1">
            <label className={optionClass}>
              <input
                type="radio"
                name="price"
                className="size-4 accent-(--accent)"
                checked={filters.price === null}
                onChange={() => setPrice(null)}
              />
              <span className="flex-1">{t("search.filters.all")}</span>
            </label>
            {facets.price.map((bucket) => (
              <label key={bucket.key} className={optionClass}>
                <input
                  type="radio"
                  name="price"
                  className="size-4 accent-(--accent)"
                  checked={bucket.selected}
                  disabled={bucket.disabled}
                  onChange={() => setPrice(bucket.key)}
                />
                <span className="flex-1">{t(`search.price.${bucket.key}` as DictionaryKey)}</span>
                <span className="text-sm text-muted-foreground">{bucket.count}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {facets.groups.map((group) => (
        <fieldset key={group.key}>
          <legend className="mb-2 text-sm font-semibold">{attributeLabel(group.key)}</legend>
          <div className="flex flex-col gap-1">
            {group.values.map((v) => (
              <label key={String(v.value)} className={optionClass}>
                <input
                  type="checkbox"
                  className="size-4 accent-(--accent)"
                  checked={v.selected}
                  disabled={v.disabled}
                  onChange={() => toggle(group.key, v.value)}
                />
                <span className="flex-1">{formatAttribute(group.key, v.value, vocabulary)}</span>
                <span className="text-sm text-muted-foreground">{v.count}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {filters.category === null && facets.groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("search.filters.hint")}</p>
      ) : null}
    </div>
  );
}
