"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useCatalog } from "@/components/catalog/catalog-context";
import { useLocalData } from "@/components/local-data/local-data";
import { ItemArt, itemDetails } from "@/components/orders/item-display";
import { renderableOrderImage } from "@/components/orders/order-lines";
import { useNow } from "@/components/orders/use-now";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDateVi } from "@/lib/format";
import { computeOrderState, scheduledDeliveryMs, type OrderItemSnapshot } from "@/modules/orders";
import { t } from "@/platform/i18n";

const REFRESH_MS = 5000;

interface CollectionEntry {
  readonly key: string;
  readonly item: OrderItemSnapshot;
  readonly orderId: string;
  readonly code: string;
  readonly deliveredAtMs: number | null;
}

/**
 * My Collection is derived, never stored: every item line of every order that has been delivered (and not
 * cancelled), read from the order snapshot. One line of one order appears exactly once. It needs no network.
 */
export function CollectionExperience() {
  const data = useLocalData();
  const { view } = useCatalog();
  const now = useNow(REFRESH_MS);
  const { recordProgress, dismissNotice } = data;

  const entries = useMemo<CollectionEntry[]>(() => {
    return data.orders
      .filter(
        ({ order }) =>
          computeOrderState(order.simulation, now || order.createdAtMs) === "VIRTUALLY_DELIVERED",
      )
      .flatMap(({ order }) =>
        order.items.map((item) => ({
          key: `${order.id}|${item.variantId}|${item.offerId}`,
          item,
          orderId: order.id,
          code: order.code,
          deliveredAtMs: scheduledDeliveryMs(order.simulation.scenario),
        })),
      )
      .sort((a, b) => (b.deliveredAtMs ?? 0) - (a.deliveredAtMs ?? 0));
  }, [data.orders, now]);

  const deliveredIds = useMemo(
    () => [...new Set(entries.map((e) => e.orderId))].join(","),
    [entries],
  );
  useEffect(() => {
    if (deliveredIds === "") return;
    // looking at the collection is seeing the delivery: persist it and retire the notices
    void recordProgress();
    for (const id of deliveredIds.split(",")) void dismissNotice(`delivered:${id}`);
  }, [deliveredIds, recordProgress, dismissNotice]);

  if (data.status === "loading") {
    return (
      <p className="py-10 text-muted-foreground" role="status">
        {t("collection.loading")}
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center">
        <h2 className="text-title font-semibold">{t("collection.emptyTitle")}</h2>
        <p className="mx-auto mt-2 max-w-prose text-muted-foreground">
          {t("collection.emptyBody")}
        </p>
        <div className="mt-6">
          <Link href="/orders" className={buttonVariants()}>
            {t("collection.emptyCta")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t("collection.count", { count: entries.length })}
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {entries.map(({ key, item, orderId, code, deliveredAtMs }) => {
          const image = renderableOrderImage(item.imageRef, view.catalog.media);
          return (
            <li
              key={key}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card"
            >
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-art-stage text-muted-foreground">
                <ItemArt item={item} view={view} iconSize={48} />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">{item.titleVi}</h2>
                {itemDetails(item, view) ? (
                  <p className="text-sm text-muted-foreground">{itemDetails(item, view)}</p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  {t("collection.quantity", { count: item.quantity })} ·{" "}
                  {t("collection.fromOrder", { code })}
                </p>
                {deliveredAtMs !== null ? (
                  <p className="text-sm text-muted-foreground">
                    {t("collection.deliveredOn", {
                      date: formatDateVi(new Date(deliveredAtMs).toISOString()),
                    })}
                  </p>
                ) : null}
                {image?.credit ? (
                  <p className="text-xs text-muted-foreground">{image.credit}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone="simulation">{t("collection.badge")}</Badge>
                <Link
                  href={`/orders/${orderId}`}
                  className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-2"
                >
                  {t("collection.viewOrder")}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
