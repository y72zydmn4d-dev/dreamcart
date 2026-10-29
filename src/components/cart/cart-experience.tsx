"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCatalog } from "@/components/catalog/catalog-context";
import { PriceNote } from "@/components/product/price-note";
import { OutboundLink } from "@/components/product/outbound-link";
import { useLocalData } from "@/components/local-data/local-data";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import {
  assessLine,
  checkoutStatus,
  lineKey,
  MAX_QUANTITY,
  subtotalsByCurrency,
  type CartLine,
  type LineStatus,
} from "@/modules/cart";
import { multiplyMinor, type Money } from "@/modules/shared/domain/money";
import { t, type DictionaryKey } from "@/platform/i18n";
import { cartFailureText } from "./messages";
import { buildLineIndex, resolveLine, type ResolvedLine } from "./resolve-line";

interface Row {
  readonly resolved: ResolvedLine;
  readonly status: LineStatus;
  readonly key: string;
}

const totalsText = (lines: readonly CartLine[]): string[] => {
  const totals = subtotalsByCurrency({ lines: [...lines], revision: 0, checkoutKey: "-" });
  return Object.entries(totals).map(([currency, amountMinor]) =>
    formatMoney(amountMinor as number, currency),
  );
};

export function CartExperience() {
  const { view, synthetic, nowMs } = useCatalog();
  const data = useLocalData();
  const { cart, userProducts } = data;
  const [message, setMessage] = useState("");

  const rows = useMemo<Row[]>(() => {
    if (!cart) return [];
    const index = buildLineIndex(view, userProducts, nowMs);
    return cart.lines.map((line) => {
      const resolved = resolveLine(line, index);
      return { resolved, status: assessLine(line, resolved.current), key: lineKey(line) };
    });
  }, [cart, view, userProducts, nowMs]);

  const groups = useMemo(() => {
    const byHeading = new Map<string, Row[]>();
    for (const row of rows) {
      const heading =
        row.resolved.origin === "unknown"
          ? t("cart.groupUnknown")
          : t("cart.group", { name: row.resolved.merchant });
      byHeading.set(heading, [...(byHeading.get(heading) ?? []), row]);
    }
    return [...byHeading.entries()];
  }, [rows]);

  if (data.status === "loading" || !cart) {
    return (
      <p className="py-10 text-muted-foreground" role="status">
        {data.status === "failed" ? "" : t("cart.loading")}
      </p>
    );
  }

  const changedPrices = new Map<string, Money>(
    rows.flatMap((r) => (r.status.kind === "price_changed" ? [[r.key, r.status.current]] : [])),
  );
  const issues = rows.filter((r) => r.status.kind !== "ok").length;
  const blocked = checkoutStatus(cart);

  const run = async (
    action: () => ReturnType<typeof data.changeQuantity>,
    success: string,
  ): Promise<void> => {
    const result = await action();
    setMessage(result.ok ? success : cartFailureText(result));
  };

  return (
    <div className="flex flex-col gap-8">
      {data.changedElsewhere ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-accent-soft p-4 text-accent-soft-foreground"
        >
          <p>{t("cart.changedElsewhere")}</p>
          <Button variant="outline" size="sm" onClick={data.dismissChangedElsewhere}>
            {t("cart.dismiss")}
          </Button>
        </div>
      ) : null}

      {cart.lines.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center">
          <h2 className="text-title font-semibold">{t("cart.emptyTitle")}</h2>
          <p className="mx-auto mt-2 max-w-prose text-muted-foreground">{t("cart.emptyBody")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/search" className={buttonVariants()}>
              {t("cart.emptyBrowse")}
            </Link>
            <Link href="/import" className={buttonVariants({ variant: "outline" })}>
              {t("cart.emptyImport")}
            </Link>
          </div>
        </section>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-8">
            {groups.map(([heading, groupRows], groupIndex) => (
              <section
                key={heading}
                aria-labelledby={`cart-group-${groupIndex}`}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id={`cart-group-${groupIndex}`} className="text-title font-semibold">
                    {heading}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {totalsText(groupRows.map((r) => r.resolved.line)).join(" + ")}
                  </p>
                </div>
                <ul className="flex flex-col gap-3">
                  {groupRows.map((row) => (
                    <li key={row.key}>
                      <CartLineCard
                        row={row}
                        synthetic={synthetic}
                        onQuantity={(q) =>
                          run(
                            () => data.changeQuantity(row.key, q),
                            t("cart.line.quantitySet", { title: row.resolved.title, count: q }),
                          )
                        }
                        onRemove={() =>
                          run(
                            () => data.removeFromCart(row.key),
                            t("cart.line.removed", { title: row.resolved.title }),
                          )
                        }
                        onAccept={() =>
                          run(
                            () =>
                              data.acceptCurrentPrices(
                                row.status.kind === "price_changed"
                                  ? new Map([[row.key, row.status.current]])
                                  : new Map(),
                              ),
                            t("cart.status.accepted"),
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <aside
            aria-labelledby="cart-summary"
            className="flex h-fit flex-col gap-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-32"
          >
            <h2 id="cart-summary" className="text-title font-semibold">
              {t("cart.total")}
            </h2>
            <ul className="flex flex-col gap-1">
              {totalsText(cart.lines).map((text) => (
                <li key={text} className="text-2xl font-semibold">
                  {text}
                </li>
              ))}
            </ul>
            {Object.keys(subtotalsByCurrency(cart)).length > 1 ? (
              <p className="text-sm text-muted-foreground">{t("cart.mixedCurrency")}</p>
            ) : null}
            {changedPrices.size > 0 ? (
              <Button
                variant="outline"
                onClick={() =>
                  run(() => data.acceptCurrentPrices(changedPrices), t("cart.status.accepted"))
                }
              >
                {t("cart.status.acceptAll")}
              </Button>
            ) : null}
            {issues > 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("cart.checkout.blockedIssues", { count: issues })}
              </p>
            ) : null}
            {blocked === "blocked:mixed_currency" ? (
              <p className="text-sm text-muted-foreground">{t("cart.checkout.blockedMixed")}</p>
            ) : null}
            {blocked === "blocked:currency_not_supported" ? (
              <p className="text-sm text-muted-foreground">{t("cart.checkout.blockedCurrency")}</p>
            ) : null}
            <Button disabled aria-describedby="checkout-note">
              {t("cart.checkout.cta")}
            </Button>
            <p id="checkout-note" className="text-sm text-muted-foreground">
              {t("cart.checkout.soon")}
            </p>
            <p className="text-xs text-muted-foreground">{t("cart.disclosure")}</p>
          </aside>
        </div>
      )}

      <p role="status" className={message ? "text-sm" : "sr-only"} data-testid="cart-status">
        {message}
      </p>
    </div>
  );
}

function CartLineCard({
  row,
  synthetic,
  onQuantity,
  onRemove,
  onAccept,
}: {
  readonly row: Row;
  readonly synthetic: boolean;
  readonly onQuantity: (quantity: number) => void;
  readonly onRemove: () => void;
  readonly onAccept: () => void;
}) {
  const { resolved, status } = row;
  const { line } = resolved;
  const unit = formatMoney(line.unitPrice.amountMinor, line.unitPrice.currency);
  const lineTotal = formatMoney(
    multiplyMinor(line.unitPrice.amountMinor, line.quantity),
    line.unitPrice.currency,
  );

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">
            {resolved.productId ? (
              <Link href={`/product/${resolved.productId}`} className="hover:text-accent">
                {resolved.title}
              </Link>
            ) : (
              resolved.title
            )}
          </h3>
          {resolved.details ? (
            <p className="text-sm text-muted-foreground">{resolved.details}</p>
          ) : null}
          <div className="mt-1 flex flex-wrap gap-2">
            {resolved.origin === "user" ? (
              <Badge tone="warning">{t("cart.line.unverified")}</Badge>
            ) : null}
            {synthetic && resolved.origin === "catalog" ? (
              <Badge tone="fixture">{t("fixture.badge")}</Badge>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">{t("cart.line.unitPrice", { price: unit })}</p>
          {resolved.origin === "catalog" && resolved.observedAt && resolved.priceState ? (
            <PriceNote
              observedAt={resolved.observedAt}
              state={resolved.priceState}
              synthetic={synthetic}
              className="justify-end"
            />
          ) : resolved.origin === "user" ? (
            <p className="text-xs text-muted-foreground">{t("price.provenance.user_entered")}</p>
          ) : null}
        </div>
      </div>

      {status.kind === "price_changed" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning p-3 text-warning-foreground">
          <p className="text-sm">
            {t("cart.status.priceChanged", {
              old: unit,
              current: formatMoney(status.current.amountMinor, status.current.currency),
            })}
          </p>
          <Button variant="outline" size="sm" onClick={onAccept}>
            {t("cart.status.accept")}
          </Button>
        </div>
      ) : null}
      {status.kind === "unavailable" ? (
        <p className="rounded-lg bg-warning p-3 text-sm text-warning-foreground">
          {t("cart.status.unavailable")}
        </p>
      ) : null}
      {status.kind === "ineligible" ? (
        <p className="rounded-lg bg-warning p-3 text-sm text-warning-foreground">
          {t("cart.status.ineligible", {
            reason: t(`price.cartBlock.${status.reason}` as DictionaryKey),
          })}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("cart.line.decrease", { title: resolved.title })}
            disabled={line.quantity <= 1}
            onClick={() => onQuantity(line.quantity - 1)}
          >
            −
          </Button>
          <span
            className="min-w-10 text-center font-medium"
            role="img"
            aria-label={t("cart.line.quantity", { title: resolved.title }) + ": " + line.quantity}
          >
            {line.quantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("cart.line.increase", { title: resolved.title })}
            onClick={() => onQuantity(line.quantity + 1)}
            data-max={MAX_QUANTITY}
          >
            +
          </Button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("cart.line.remove", { title: resolved.title })}
            className="ml-2 min-h-11 cursor-pointer rounded-full px-3 text-sm underline underline-offset-2"
          >
            {t("cart.line.removeShort")}
          </button>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="font-semibold">{t("cart.line.lineTotal", { price: lineTotal })}</p>
          {resolved.sourceUrl ? (
            <OutboundLink url={resolved.sourceUrl} label={t("product.viewSource")} />
          ) : null}
        </div>
      </div>
    </article>
  );
}
