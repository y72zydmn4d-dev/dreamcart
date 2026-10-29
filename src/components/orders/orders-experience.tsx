"use client";

import Link from "next/link";
import { useLocalData } from "@/components/local-data/local-data";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDateVi, formatMoney } from "@/lib/format";
import { computeOrderState } from "@/modules/orders";
import { t } from "@/platform/i18n";
import { stateLabel } from "./state-label";
import { useNow } from "./use-now";

const REFRESH_MS = 5000;

/** Newest first, from the stored snapshots. The state shown is the simulated state right now. */
export function OrdersExperience({ deleted }: { readonly deleted: boolean }) {
  const data = useLocalData();
  const now = useNow(REFRESH_MS);

  if (data.status === "loading") {
    return (
      <p className="py-10 text-muted-foreground" role="status">
        {t("orders.loading")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {deleted ? (
        <p role="status" className="rounded-xl bg-accent-soft p-4 text-accent-soft-foreground">
          {t("orders.deleted")}
        </p>
      ) : null}
      {data.orders.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center">
          <h2 className="text-title font-semibold">{t("orders.emptyTitle")}</h2>
          <p className="mx-auto mt-2 max-w-prose text-muted-foreground">{t("orders.emptyBody")}</p>
          <div className="mt-6">
            <Link href="/cart" className={buttonVariants()}>
              {t("checkout.toCart")}
            </Link>
          </div>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.orders.map(({ order }) => {
            const state = computeOrderState(order.simulation, now || order.createdAtMs);
            return (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-card hover:shadow-float"
                >
                  <div className="min-w-0">
                    <p className="font-mono font-semibold">{order.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("orders.placed", {
                        date: formatDateVi(new Date(order.createdAtMs).toISOString()),
                      })}{" "}
                      ·{" "}
                      {t("orders.items", {
                        count: order.items.reduce((sum, i) => sum + i.quantity, 0),
                      })}
                    </p>
                    <p className="mt-1 text-sm">{order.items[0]?.titleVi}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone="simulation">{t("orders.watermark")}</Badge>
                    <p className="font-semibold">{formatMoney(order.total.amountMinor, "VND")}</p>
                    <p className="text-sm text-muted-foreground">{stateLabel(state)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
