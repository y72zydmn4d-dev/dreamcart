"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, ChevronDownIcon, InfoIcon } from "@/components/ui/icons";
import { formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deriveConfigurator,
  selectOption,
  type AttributeValue,
  type Selection,
} from "@/modules/configurator/domain/configurator";
import { t } from "@/platform/i18n";
import type { AttributeKey, PrototypeProduct } from "@/prototype/catalog";
import { attributeLabel, formatAttribute } from "./attribute-format";

interface ConfiguratorProps {
  readonly product: PrototypeProduct;
  readonly selection: Selection;
  readonly initialSelection: Selection;
  readonly onChange: (next: Selection) => void;
}

interface Conflict {
  readonly key: AttributeKey;
  readonly value: AttributeValue;
  readonly conflicts: readonly string[];
  readonly selectionIfReset: Selection;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Hybrid Continuous Configurator (decision P-5): every group on one page, collapsible, revisitable in
 * any order, with quick navigation and a sticky summary. Availability comes from the domain module;
 * an incompatible choice asks before changing anything.
 */
export function Configurator({
  product,
  selection,
  initialSelection,
  onChange,
}: ConfiguratorProps) {
  const uid = useId();
  const view = useMemo(
    () => deriveConfigurator(product.variants, product.groups, selection),
    [product, selection],
  );
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [notice, setNotice] = useState(false);

  const sectionId = (key: string) => `${uid}-section-${key}`;
  const headerId = (key: string) => `${uid}-header-${key}`;
  const valueText = (key: string, value: AttributeValue) =>
    formatAttribute(key as AttributeKey, value);

  const choose = (key: AttributeKey, value: AttributeValue) => {
    setNotice(false);
    const result = selectOption(product.variants, selection, key, value);
    if (result.status === "ok") {
      setConflict(null);
      onChange(result.selection);
    } else {
      setConflict({
        key,
        value,
        conflicts: result.conflicts,
        selectionIfReset: result.selectionIfReset,
      });
    }
  };

  const jumpTo = (key: string) => {
    setCollapsed((s) => {
      const next = new Set(s);
      next.delete(key);
      return next;
    });
    requestAnimationFrame(() => {
      document.getElementById(sectionId(key))?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
      document.getElementById(headerId(key))?.focus({ preventScroll: true });
    });
  };

  const resolved = view.resolvedVariantId
    ? product.variants.find((v) => v.id === view.resolvedVariantId)
    : undefined;
  const matchingPrices = product.variants
    .filter((v) => view.matchingVariantIds.includes(v.id))
    .map((v) => v.samplePriceMinor);
  const minPrice = Math.min(...matchingPrices);
  const maxPrice = Math.max(...matchingPrices);
  const missingLabels = view.missing.map((k) => attributeLabel(k as AttributeKey)).join(", ");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title font-semibold">{t("configurator.heading")}</h2>
        <button
          type="button"
          onClick={() => {
            setConflict(null);
            setNotice(false);
            onChange(initialSelection);
          }}
          className="min-h-11 cursor-pointer rounded-full px-3 text-sm underline underline-offset-2"
        >
          {t("configurator.reset")}
        </button>
      </div>

      <nav aria-label={t("configurator.quickNav")} className="-mx-1 overflow-x-auto px-1">
        <ul className="flex gap-2 pb-1">
          {product.groups.map((key) => {
            const value = selection[key];
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => jumpTo(key)}
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm whitespace-nowrap",
                    value !== undefined
                      ? "border-transparent bg-accent-soft text-accent-soft-foreground"
                      : "border-border bg-surface",
                  )}
                >
                  {value !== undefined ? <CheckIcon size={16} /> : null}
                  <span className="font-medium">{attributeLabel(key)}</span>
                  <span className={value !== undefined ? "" : "text-muted-foreground"}>
                    · {value !== undefined ? valueText(key, value) : t("configurator.notSelected")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-4">
        {view.groups.map((group) => {
          const key = group.key as AttributeKey;
          const isCollapsed = collapsed.has(key);
          const selected = selection[key];
          const panelId = `${sectionId(key)}-panel`;
          const single = group.options.length === 1;
          return (
            <section
              key={key}
              id={sectionId(key)}
              aria-labelledby={headerId(key)}
              className="scroll-mt-32 rounded-2xl border border-border bg-surface"
            >
              <h3>
                <button
                  id={headerId(key)}
                  type="button"
                  aria-expanded={!isCollapsed}
                  aria-controls={panelId}
                  onClick={() =>
                    setCollapsed((s) => {
                      const next = new Set(s);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                  className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-5 py-3 text-left"
                >
                  <span className="flex flex-col">
                    <span className="font-semibold">{attributeLabel(key)}</span>
                    <span className="text-sm text-muted-foreground">
                      {selected !== undefined
                        ? valueText(key, selected)
                        : t("configurator.notSelected")}
                    </span>
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "shrink-0 transition-transform duration-(--duration-base)",
                      isCollapsed ? "" : "rotate-180",
                    )}
                  />
                </button>
              </h3>
              <div id={panelId} hidden={isCollapsed} className="px-5 pb-5">
                <div
                  role="group"
                  aria-labelledby={headerId(key)}
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                >
                  {group.options.map((option) => {
                    // Deliberately operable: choosing it explains the conflict and offers an explicit
                    // reset, so it is not aria-disabled; the reason is part of its accessible name.
                    const unavailable = option.state === "unavailable";
                    const reason = unavailable
                      ? t("configurator.unavailableWith", {
                          values: option.conflicts
                            .map((g) => valueText(g, selection[g]!))
                            .join(", "),
                        })
                      : null;
                    return (
                      <button
                        key={String(option.value)}
                        type="button"
                        aria-pressed={option.state === "selected"}
                        data-state={option.state}
                        onClick={() => choose(key, option.value)}
                        className={cn(
                          "flex min-h-14 cursor-pointer flex-col items-start justify-center rounded-xl border-2 px-4 py-2.5 text-left transition-colors duration-(--duration-fast)",
                          option.state === "selected" &&
                            "border-accent bg-accent-soft text-accent-soft-foreground",
                          option.state === "available" &&
                            "border-border hover:border-border-strong",
                          unavailable && "border-dashed border-border text-muted-foreground",
                        )}
                      >
                        <span className="flex w-full items-center justify-between gap-2 font-medium">
                          {valueText(key, option.value)}
                          {option.state === "selected" ? <CheckIcon size={18} /> : null}
                        </span>
                        {reason ? (
                          <span className="text-xs">{reason}</span>
                        ) : single ? (
                          <span className="text-xs text-muted-foreground">
                            {t("configurator.onlyOption")}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {conflict && conflict.key === key ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-border-strong bg-muted p-4"
                  >
                    <p className="flex items-start gap-2 font-medium">
                      <InfoIcon size={18} className="mt-0.5 shrink-0" />
                      {t("configurator.conflictTitle", { value: valueText(key, conflict.value) })}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("configurator.conflictBody", {
                        value: valueText(key, conflict.value),
                        values: conflict.conflicts
                          .map((g) => valueText(g, selection[g]!))
                          .join(", "),
                      })}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="min-h-11"
                        onClick={() => {
                          onChange(conflict.selectionIfReset);
                          setConflict(null);
                        }}
                      >
                        {t("configurator.conflictApply", {
                          value: valueText(key, conflict.value),
                          groups: conflict.conflicts
                            .map((g) => attributeLabel(g as AttributeKey))
                            .join(", "),
                        })}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-11"
                        onClick={() => setConflict(null)}
                      >
                        {t("configurator.conflictKeep")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <div
        role="region"
        aria-label={t("configurator.summary")}
        className="sticky bottom-0 z-20 -mx-gutter border-t border-border bg-background/90 px-gutter py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:shadow-float"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{t("configurator.summary")}</p>
            <p className="font-medium">
              {product.groups
                .filter((k) => selection[k] !== undefined)
                .map((k) => valueText(k, selection[k]!))
                .join(" · ") || t("configurator.notSelected")}
            </p>
            <p className="text-lg font-semibold" aria-live="polite">
              {resolved
                ? formatVnd(resolved.samplePriceMinor)
                : minPrice === maxPrice
                  ? t("configurator.priceFrom", { price: formatVnd(minPrice) })
                  : t("configurator.priceRange", {
                      min: formatVnd(minPrice),
                      max: formatVnd(maxPrice),
                    })}
              <span className="ml-2 align-middle text-xs font-normal text-muted-foreground">
                {t("fixture.priceLabel")}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {resolved
                ? t("configurator.complete")
                : t("configurator.missing", { groups: missingLabels })}
            </p>
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            {/* Stays operable when incomplete: it takes the user to the first missing group. */}
            <Button
              size="lg"
              aria-describedby={`${uid}-cta-hint`}
              onClick={() => {
                if (resolved) setNotice(true);
                else if (view.missing[0]) jumpTo(view.missing[0]);
              }}
              className="w-full sm:w-auto"
            >
              {t("configurator.addToCart")}
            </Button>
            {!resolved ? (
              <p id={`${uid}-cta-hint`} className="text-xs text-muted-foreground">
                {t("configurator.selectAll")}
              </p>
            ) : (
              <p id={`${uid}-cta-hint`} className="font-mono text-xs text-muted-foreground">
                {t("configurator.variantId", { id: resolved.id })}
              </p>
            )}
          </div>
        </div>
        <p role="status" className={cn("text-sm", notice ? "mt-3" : "sr-only")}>
          {notice ? t("configurator.prototypeNotice") : ""}
        </p>
      </div>
    </div>
  );
}
