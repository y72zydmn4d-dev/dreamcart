"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCatalog } from "@/components/catalog/catalog-context";
import { saveReasonText } from "@/components/cart/messages";
import { useLocalData } from "@/components/local-data/local-data";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { PackageIcon } from "@/components/ui/icons";
import { formatDateVi, formatMoney } from "@/lib/format";
import { canCancel, computeOrderState } from "@/modules/orders";
import { t, type DictionaryKey } from "@/platform/i18n";
import { renderableOrderImage } from "./order-lines";
import { stateLabel } from "./state-label";
import { useNow } from "./use-now";

const REFRESH_MS = 5000;

/**
 * One order, rendered only from its stored snapshot: nothing here depends on the catalog still containing the
 * product, except the image, which is re-checked against current rights (a withdrawn image falls back).
 */
export function OrderDetail({ id, placed }: { readonly id: string; readonly placed: boolean }) {
  const router = useRouter();
  const { view } = useCatalog();
  const data = useLocalData();
  const now = useNow(REFRESH_MS);
  const [confirming, setConfirming] = useState<"cancel" | "delete" | null>(null);
  const [message, setMessage] = useState("");

  if (data.status === "loading") {
    return (
      <p className="py-10 text-muted-foreground" role="status">
        {t("orders.loading")}
      </p>
    );
  }
  const found = data.orders.find((o) => o.order.id === id);
  if (!found) {
    return (
      <section className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center">
        <h2 className="text-title font-semibold">{t("orders.notFoundTitle")}</h2>
        <p className="mx-auto mt-2 max-w-prose text-muted-foreground">{t("orders.notFoundBody")}</p>
        <div className="mt-6">
          <Link href="/orders" className={buttonVariants()}>
            {t("orders.back")}
          </Link>
        </div>
      </section>
    );
  }

  const { order } = found;
  const state = computeOrderState(order.simulation, now || order.createdAtMs);

  const cancel = async () => {
    const result = await data.cancelOrder(order.id);
    setConfirming(null);
    if (result.ok) setMessage(t("orders.cancelled"));
    else if (result.error === "not_cancellable") setMessage(t("orders.notCancellable"));
    else if (result.error === "already_cancelled") setMessage(t("orders.alreadyCancelled"));
    else if (result.error === "storage")
      setMessage(t("orders.actionFailed", { reason: saveReasonText(result.kind) }));
    else setMessage(t("orders.notFoundTitle"));
  };

  const remove = async () => {
    if (await data.deleteOrder(order.id)) router.push("/orders?deleted=1" as Route);
    else {
      setConfirming(null);
      setMessage(t("orders.actionFailed", { reason: saveReasonText("unknown") }));
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {placed ? (
        <section
          role="status"
          className="flex flex-col gap-1 rounded-xl border border-border bg-accent-soft p-5 text-accent-soft-foreground"
        >
          <h2 className="text-title font-semibold">{t("orders.placedBannerTitle")}</h2>
          <p>{t("orders.placedBannerBody")}</p>
        </section>
      ) : null}

      <section
        aria-labelledby="order-code"
        className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-border-strong bg-surface p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{t("orders.code")}</p>
            <h2 id="order-code" className="font-mono text-headline font-semibold">
              {order.code}
            </h2>
          </div>
          <Badge tone="simulation">{t("checkout.watermark")}</Badge>
        </div>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Fact label={t("orders.status")}>
            <span className="font-medium" data-testid="order-state">
              {stateLabel(state)}
            </span>
            <span className="block text-muted-foreground">{t("orders.statusNote")}</span>
          </Fact>
          <Fact label={t("orders.createdAt")}>
            {formatDateVi(new Date(order.createdAtMs).toISOString())}
          </Fact>
          <Fact label={t("orders.scenario")}>
            {t(`checkout.scenario.${order.simulation.scenario.scenario}.name` as DictionaryKey)}
          </Fact>
          <Fact label={t("orders.destination")}>
            {t(`checkout.destination.${order.destination}` as DictionaryKey)}
          </Fact>
          <Fact label={t("orders.payment")}>
            {t(`checkout.payment.${order.payment}` as DictionaryKey)}
          </Fact>
          <Fact label={t("orders.total")}>
            <span className="text-lg font-semibold">
              {formatMoney(order.total.amountMinor, order.total.currency)}
            </span>
          </Fact>
        </dl>
        <p className="text-xs text-muted-foreground">
          {t("orders.catalogVersion", { version: order.catalogVersion })}
        </p>
      </section>

      <section aria-labelledby="order-items" className="flex flex-col gap-3">
        <h2 id="order-items" className="text-title font-semibold">
          {t("orders.itemsHeading")}
        </h2>
        <ul className="flex flex-col gap-3">
          {order.items.map((item) => {
            const image = renderableOrderImage(item.imageRef, view.catalog.media);
            return (
              <li
                key={`${item.variantId}|${item.offerId}`}
                className="flex gap-4 rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-art-stage text-muted-foreground">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- self-hosted, rights re-checked above
                    <img src={image.src} alt={image.alt} className="size-full object-contain" />
                  ) : (
                    <PackageIcon size={28} aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.titleVi}</p>
                  {Object.keys(item.attributes).length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {Object.values(item.attributes).join(" · ")}
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    {item.merchantName} · {t("orders.quantity", { count: item.quantity })}
                  </p>
                  <p className="text-sm">
                    {t("orders.unitPrice", {
                      price: formatMoney(item.price.amountMinor, item.price.currency),
                    })}
                  </p>
                  {item.priceStateAtPlacement === "USER_ENTERED" ? (
                    <Badge tone="warning" className="mt-1">
                      {t("orders.userEntered")}
                    </Badge>
                  ) : null}
                  {item.freshnessWarningShown ? (
                    <Badge tone="warning" className="mt-1">
                      {t("orders.staleAtPlacement")}
                    </Badge>
                  ) : null}
                  {image?.credit ? (
                    <p className="text-xs text-muted-foreground">{image.credit}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        {order.items.some((i) => !renderableOrderImage(i.imageRef, view.catalog.media)) ? (
          <p className="text-xs text-muted-foreground">{t("orders.imageNote")}</p>
        ) : null}
      </section>

      <section aria-labelledby="order-actions" className="flex flex-col gap-3">
        <h2 id="order-actions" className="sr-only">
          {t("orders.status")}
        </h2>
        <div className="flex flex-wrap items-start gap-3">
          {canCancel(state) ? (
            confirming === "cancel" ? (
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={cancel}>
                  {t("orders.cancelConfirm")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                  {t("search.filters.close")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <Button variant="outline" onClick={() => setConfirming("cancel")}>
                  {t("orders.cancel")}
                </Button>
                <p className="max-w-xs text-xs text-muted-foreground">{t("orders.cancelNote")}</p>
              </div>
            )
          ) : null}
          {confirming === "delete" ? (
            <div className="flex flex-col gap-2">
              <p className="max-w-xs text-sm text-muted-foreground">{t("orders.deleteNote")}</p>
              <Button variant="outline" onClick={remove}>
                {t("orders.deleteConfirm")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                {t("search.filters.close")}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirming("delete")}>
              {t("orders.delete")}
            </Button>
          )}
        </div>
        <p role="status" className={message ? "text-sm" : "sr-only"} data-testid="order-status">
          {message}
        </p>
        <p>
          <Link href="/orders" className="underline underline-offset-2">
            {t("orders.back")}
          </Link>
        </p>
      </section>
    </div>
  );
}

function Fact({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
