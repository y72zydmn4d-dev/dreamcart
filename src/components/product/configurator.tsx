"use client";

import { useId, useMemo, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import Link from "next/link";
import { useAddOffer } from "@/components/cart/use-add-offer";
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
import type { Vocabulary } from "@/modules/catalog";
import type { ProductView } from "@/modules/discovery";
import { t } from "@/platform/i18n";
import { attributeLabel, formatAttribute } from "./attribute-format";
import { PriceNote } from "./price-note";

interface ConfiguratorProps {
  readonly product: ProductView;
  /** Option groups in display order; only groups the catalog has data for. */
  readonly groups: readonly string[];
  readonly vocabulary: Vocabulary;
  readonly synthetic: boolean;
  readonly selection: Selection;
  readonly initialSelection: Selection;
  readonly onChange: (next: Selection) => void;
}

interface Conflict {
  readonly key: string;
  readonly value: AttributeValue;
  readonly conflicts: readonly string[];
  readonly selectionIfReset: Selection;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * True while an on-screen keyboard shrinks the visual viewport (pinch-zoom excluded). The sticky bar
 * then stops floating so it cannot sit over the little space the keyboard leaves.
 */
function subscribeKeyboard(onChange: () => void) {
  const vv = window.visualViewport;
  vv?.addEventListener("resize", onChange);
  return () => vv?.removeEventListener("resize", onChange);
}
const keyboardOpenNow = () => {
  const vv = window.visualViewport;
  return !!vv && vv.scale <= 1.01 && window.innerHeight - vv.height > 150;
};

/**
 * Hybrid Continuous Configurator (decision P-5): every group on one page, collapsible, revisitable in
 * any order, with quick navigation and a sticky summary. Availability comes from the domain module;
 * an incompatible choice asks before changing anything.
 */
export function Configurator({
  product,
  groups,
  vocabulary,
  synthetic,
  selection,
  initialSelection,
  onChange,
}: ConfiguratorProps) {
  const uid = useId();
  const configVariants = useMemo(
    () => product.variants.map((v) => ({ id: v.variant.id, attributes: v.variant.attributes })),
    [product],
  );
  const view = useMemo(
    () => deriveConfigurator(configVariants, groups, selection),
    [configVariants, groups, selection],
  );
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const { add, pending, ready } = useAddOffer();
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const keyboardOpen = useSyncExternalStore(subscribeKeyboard, keyboardOpenNow, () => false);

  const sectionId = (key: string) => `${uid}-section-${key}`;
  const headerId = (key: string) => `${uid}-header-${key}`;
  const valueText = (key: string, value: AttributeValue) => formatAttribute(key, value, vocabulary);

  const choose = (key: string, value: AttributeValue) => {
    setNotice(null);
    const result = selectOption(configVariants, selection, key, value);
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
    ? product.variants.find((v) => v.variant.id === view.resolvedVariantId)
    : undefined;
  // Prices come only from verified offers on the variants still possible; a variant with no offer has none.
  const matchingBest = product.variants
    .filter((v) => view.matchingVariantIds.includes(v.variant.id))
    .flatMap((v) => (v.best ? [v.best.amountMinor] : []));
  const minPrice = matchingBest.length > 0 ? Math.min(...matchingBest) : null;
  const maxPrice = matchingBest.length > 0 ? Math.max(...matchingBest) : null;
  const missingLabels = view.missing.map((k) => attributeLabel(k)).join(", ");
  const resolvedPrice = resolved?.best ?? null;
  const fullPrice = resolved
    ? resolvedPrice
      ? formatVnd(resolvedPrice.amountMinor)
      : t("search.noPrice")
    : minPrice === null || maxPrice === null
      ? t("search.noPrice")
      : minPrice === maxPrice
        ? t("configurator.priceFrom", { price: formatVnd(minPrice) })
        : t("configurator.priceRange", { min: formatVnd(minPrice), max: formatVnd(maxPrice) });
  // The compact bar shows only the lowest matching price; the exact range is in the expanded summary.
  const compactPrice = resolved
    ? fullPrice
    : minPrice === null
      ? t("search.noPrice")
      : t("configurator.priceFrom", { price: formatVnd(minPrice) });
  const statusText = resolved
    ? resolvedPrice
      ? t("product.configPriced")
      : t("product.configUnpriced")
    : t("configurator.missing", { groups: missingLabels });
  const hintText = resolved
    ? t("configurator.variantId", { id: resolved.variant.id })
    : t("configurator.selectAll");
  const priceNote = resolvedPrice ? (
    <PriceNote
      observedAt={resolvedPrice.observedAt}
      state={resolvedPrice.state}
      synthetic={synthetic}
    />
  ) : null;
  // Stays operable when incomplete: it takes the user to the first missing group. With a complete configuration it
  // adds the cheapest offer that may be carted and names the merchant, so the choice is never hidden; any other
  // offer can be added from the list below.
  const onAddToCart = async () => {
    if (pending) return;
    if (!resolved) {
      if (view.missing[0]) jumpTo(view.missing[0]);
      return;
    }
    const best = resolved.offers.find((o) => o.evaluation.addable && o.offer.price);
    if (!best?.offer.price) {
      setNotice({ text: t("cart.noAddableOffer"), ok: false });
      return;
    }
    const outcome = await add({
      variantId: resolved.variant.id,
      offerId: best.offer.id,
      unitPrice: {
        amountMinor: best.offer.price.amountMinor,
        currency: best.offer.price.currency,
      },
      evaluation: best.evaluation,
      title: product.product.titleVi,
      merchant: best.offer.merchantName,
    });
    setNotice({ text: outcome.message, ok: outcome.ok });
  };
  const noticeContent = notice ? (
    <>
      {notice.text}
      {notice.ok ? (
        <>
          {" "}
          <Link href="/cart" className="font-medium underline underline-offset-2">
            {t("cart.viewCart")}
          </Link>
        </>
      ) : null}
    </>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title font-semibold">{t("configurator.heading")}</h2>
        <button
          type="button"
          onClick={() => {
            setConflict(null);
            setNotice(null);
            onChange(initialSelection);
          }}
          className="min-h-11 cursor-pointer rounded-full px-3 text-sm underline underline-offset-2"
        >
          {t("configurator.reset")}
        </button>
      </div>

      <nav aria-label={t("configurator.quickNav")} className="-mx-1 overflow-x-auto px-1">
        <ul className="flex gap-2 pb-1">
          {groups.map((key) => {
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
          const key = group.key;
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
                          groups: conflict.conflicts.map((g) => attributeLabel(g)).join(", "),
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

      {/* Below sm: compact bar (price + action) that expands to the full summary on demand. */}
      <div
        role="region"
        aria-label={t("configurator.summary")}
        data-bottom-bar
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key === "Escape" && expanded) setExpanded(false);
        }}
        className={cn(
          "sticky bottom-0 z-20 -mx-gutter border-t border-border bg-background/95 px-gutter pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden",
          keyboardOpen && "static",
        )}
      >
        <div
          id={`${uid}-summary-details`}
          className={cn(
            "max-h-[45dvh] overflow-y-auto pb-3",
            expanded ? "animate-fade-up" : "hidden",
          )}
        >
          <ul className="flex flex-col gap-1 text-sm">
            {groups.map((k) => (
              <li key={k} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{attributeLabel(k)}</span>
                <span className="font-medium">
                  {selection[k] !== undefined
                    ? valueText(k, selection[k]!)
                    : t("configurator.notSelected")}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-lg font-semibold">{fullPrice}</p>
          {priceNote}
          <p className="mt-2 text-sm text-muted-foreground">{statusText}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hintText}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={`${uid}-summary-details`}
            onClick={() => setExpanded((v) => !v)}
            className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-xl text-left"
          >
            <span className="flex min-w-0 flex-col">
              <span className="font-semibold whitespace-nowrap" aria-live="polite">
                {compactPrice}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {synthetic ? t("fixture.priceLabel") : t("price.reference")} ·{" "}
                {resolved
                  ? t("configurator.selectedAll")
                  : t("configurator.missingCount", { count: view.missing.length })}
              </span>
            </span>
            <span className="sr-only">
              {expanded ? t("configurator.summaryCollapse") : t("configurator.summaryExpand")}
            </span>
            <ChevronDownIcon
              className={cn(
                "shrink-0 transition-transform duration-(--duration-base)",
                expanded ? "" : "rotate-180",
              )}
            />
          </button>
          <Button
            aria-describedby={`${uid}-cta-hint-compact`}
            onClick={onAddToCart}
            disabled={!ready}
            className="max-w-[8.5rem] shrink-0 px-4 py-1.5 leading-tight text-balance whitespace-normal"
          >
            {t("configurator.addToCart")}
          </Button>
          <span id={`${uid}-cta-hint-compact`} className="sr-only">
            {hintText}
          </span>
        </div>
        <p role="status" className={cn("text-sm", notice ? "mt-2" : "sr-only")}>
          {noticeContent}
        </p>
      </div>

      {/* sm and up: the full summary card. */}
      <div
        role="region"
        aria-label={t("configurator.summary")}
        className="sticky bottom-0 z-20 hidden rounded-2xl border border-border bg-background/90 px-gutter py-3 shadow-float backdrop-blur-md sm:block"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{t("configurator.summary")}</p>
            <p className="font-medium">
              {groups
                .filter((k) => selection[k] !== undefined)
                .map((k) => valueText(k, selection[k]!))
                .join(" · ") || t("configurator.notSelected")}
            </p>
            <p className="text-lg font-semibold" aria-live="polite">
              {fullPrice}
            </p>
            {priceNote ?? (
              <p className="text-xs text-muted-foreground">
                {synthetic ? t("fixture.priceLabel") : t("price.reference")}
              </p>
            )}
            <p className="text-sm text-muted-foreground">{statusText}</p>
          </div>
          <div className="flex flex-col gap-1 xl:items-end">
            {/* Stays operable when incomplete: it takes the user to the first missing group. */}
            <Button
              size="lg"
              aria-describedby={`${uid}-cta-hint`}
              onClick={onAddToCart}
              disabled={!ready}
            >
              {t("configurator.addToCart")}
            </Button>
            <p
              id={`${uid}-cta-hint`}
              className={cn("text-xs text-muted-foreground", resolved && "font-mono")}
            >
              {hintText}
            </p>
          </div>
        </div>
        <p role="status" className={cn("text-sm", notice ? "mt-3" : "sr-only")}>
          {noticeContent}
        </p>
      </div>
    </div>
  );
}
