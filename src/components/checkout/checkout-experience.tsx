"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useCatalog } from "@/components/catalog/catalog-context";
import { useCartRows } from "@/components/cart/use-cart-rows";
import { useLocalData } from "@/components/local-data/local-data";
import { orderLineResolver } from "@/components/orders/order-lines";
import { placeFailureText } from "@/components/orders/messages";
import { PriceNote } from "@/components/product/price-note";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { checkoutStatus, subtotalsByCurrency } from "@/modules/cart";
import {
  DESTINATION_PRESETS,
  SCENARIO_KEYS,
  type DestinationPreset,
  type ScenarioKey,
} from "@/modules/orders";
import { multiplyMinor } from "@/modules/shared/domain/money";
import { t, type DictionaryKey } from "@/platform/i18n";

const radioClass =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3 has-checked:border-accent has-checked:bg-accent-soft";

/**
 * The one confirmation step. Everything on it says "simulated": there is no payment, no merchant order and no
 * delivery. One confirm creates one immutable order; double clicks, refreshes and other tabs resolve to the same
 * order because the cart's checkout key is the idempotency key.
 */
export function CheckoutExperience() {
  const router = useRouter();
  const { view, synthetic } = useCatalog();
  const data = useLocalData();
  const rows = useCartRows();
  const { cart } = data;
  const [scenarioChoice, setScenarioChoice] = useState<ScenarioKey | null>(null);
  const [destination, setDestination] = useState<DestinationPreset>("dream_apartment");
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const scenario = scenarioChoice ?? data.settings.defaultScenario;

  if (data.status === "loading" || !cart) {
    return (
      <p className="py-10 text-muted-foreground" role="status">
        {data.status === "failed" ? "" : t("checkout.loading")}
      </p>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center">
        <h2 className="text-title font-semibold">{t("checkout.emptyTitle")}</h2>
        <p className="mx-auto mt-2 max-w-prose text-muted-foreground">{t("checkout.emptyBody")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/search" className={buttonVariants()}>
            {t("checkout.toBrowse")}
          </Link>
          <Link href="/cart" className={buttonVariants({ variant: "outline" })}>
            {t("checkout.toCart")}
          </Link>
        </div>
      </section>
    );
  }

  const status = checkoutStatus(cart);
  const issues = rows.filter((r) => r.status.kind !== "ok").length;
  if (status !== "ok" || issues > 0) {
    return (
      <section
        role="alert"
        className="flex flex-col gap-3 rounded-xl border border-border-strong bg-warning p-6 text-warning-foreground"
      >
        <h2 className="text-title font-semibold">{t("checkout.notReady")}</h2>
        {status === "blocked:mixed_currency" ? <p>{t("cart.checkout.blockedMixed")}</p> : null}
        {status === "blocked:currency_not_supported" ? (
          <p>{t("cart.checkout.blockedCurrency")}</p>
        ) : null}
        {issues > 0 ? <p>{t("checkout.issues", { count: issues })}</p> : null}
        <div>
          <Link href="/cart" className={buttonVariants({ variant: "outline" })}>
            {t("checkout.toCart")}
          </Link>
        </div>
      </section>
    );
  }

  const total = subtotalsByCurrency(cart).VND ?? 0;

  const confirm = async () => {
    if (submitting.current) return;
    if (!acknowledged) {
      setError(t("checkout.ackRequired"));
      return;
    }
    submitting.current = true;
    setPending(true);
    setError("");
    const result = await data.placeOrder({
      idempotencyKey: cart.checkoutKey,
      resolveLine: orderLineResolver(view, data.userProducts),
      catalogVersion: view.catalog.version,
      scenario,
      destination,
      payment: "dream_credits",
      acknowledged,
    });
    if (result.ok) {
      router.push(`/orders/${result.order.id}?placed=1` as Route);
      return; // the page changes; the button stays busy so it cannot be pressed again
    }
    setError(placeFailureText(result));
    submitting.current = false;
    setPending(false);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex flex-col gap-8">
        <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
          <h2 id="summary-heading" className="text-title font-semibold">
            {t("checkout.summary")}
          </h2>
          <ul className="flex flex-col gap-2">
            {rows.map(({ resolved, key }) => (
              <li
                key={key}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border bg-surface p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">{resolved.title}</p>
                  {resolved.details ? (
                    <p className="text-sm text-muted-foreground">{resolved.details}</p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    {resolved.merchant} ·{" "}
                    {t("checkout.quantity", { count: resolved.line.quantity })}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {resolved.origin === "user" ? (
                      <Badge tone="warning">{t("cart.line.unverified")}</Badge>
                    ) : null}
                    {synthetic && resolved.origin === "catalog" ? (
                      <Badge tone="fixture">{t("fixture.badge")}</Badge>
                    ) : null}
                  </div>
                  {resolved.origin === "catalog" && resolved.observedAt && resolved.priceState ? (
                    <PriceNote
                      observedAt={resolved.observedAt}
                      state={resolved.priceState}
                      synthetic={synthetic}
                    />
                  ) : null}
                </div>
                <p className="font-semibold">
                  {formatMoney(
                    multiplyMinor(resolved.line.unitPrice.amountMinor, resolved.line.quantity),
                    resolved.line.unitPrice.currency,
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-title font-semibold">{t("checkout.scenarioHeading")}</legend>
          {SCENARIO_KEYS.map((key) => (
            <label key={key} className={radioClass}>
              <input
                type="radio"
                name="scenario"
                value={key}
                checked={scenario === key}
                onChange={() => setScenarioChoice(key)}
                className="mt-1 size-4 accent-(--accent)"
              />
              <span className="flex flex-col">
                <span className="font-medium">
                  {t(`checkout.scenario.${key}.name` as DictionaryKey)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t(`checkout.scenario.${key}.body` as DictionaryKey)}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-title font-semibold">
            {t("checkout.destinationHeading")}
          </legend>
          {DESTINATION_PRESETS.map((key) => (
            <label key={key} className={radioClass}>
              <input
                type="radio"
                name="destination"
                value={key}
                checked={destination === key}
                onChange={() => setDestination(key)}
                className="mt-1 size-4 accent-(--accent)"
              />
              <span className="font-medium">
                {t(`checkout.destination.${key}` as DictionaryKey)}
              </span>
            </label>
          ))}
          <p className="text-sm text-muted-foreground">{t("checkout.destinationNote")}</p>
        </fieldset>

        <section aria-labelledby="payment-heading" className="flex flex-col gap-1">
          <h2 id="payment-heading" className="text-title font-semibold">
            {t("checkout.paymentHeading")}
          </h2>
          <p className="font-medium">{t("checkout.payment.dream_credits")}</p>
          <p className="text-sm text-muted-foreground">{t("checkout.paymentNote")}</p>
        </section>
      </div>

      <aside
        aria-labelledby="confirm-heading"
        className="flex h-fit flex-col gap-4 rounded-2xl border-2 border-dashed border-border-strong bg-surface p-5 lg:sticky lg:top-32"
      >
        <Badge tone="simulation" className="self-start">
          {t("checkout.watermark")}
        </Badge>
        <h2 id="confirm-heading" className="text-title font-semibold">
          {t("checkout.total")}
        </h2>
        <p className="text-2xl font-semibold">{formatMoney(total, "VND")}</p>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => {
              setAcknowledged(e.target.checked);
              if (e.target.checked) setError("");
            }}
            className="mt-0.5 size-5 shrink-0 accent-(--accent)"
          />
          <span>{t("checkout.ack")}</span>
        </label>
        <Button size="lg" onClick={confirm} aria-busy={pending} disabled={data.status !== "ready"}>
          {pending ? t("checkout.confirming") : t("checkout.confirm")}
        </Button>
        <p role="alert" className={error ? "text-sm text-destructive" : "sr-only"}>
          {error}
        </p>
      </aside>
    </div>
  );
}
