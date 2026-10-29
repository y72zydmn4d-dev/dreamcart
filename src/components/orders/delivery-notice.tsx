"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { useLocalData } from "@/components/local-data/local-data";
import { Button } from "@/components/ui/button";
import { computeOrderState } from "@/modules/orders";
import { t } from "@/platform/i18n";
import { useNow } from "./use-now";

/**
 * In-app notice when the app is opened (or is open) and an order has been virtually delivered since the user last
 * looked. It is remembered per order, so each delivery is announced once. It is only a message inside the page:
 * there is no push, email or system notification.
 */
export function DeliveryNotice() {
  const { orders, settings, status, dismissNotice } = useLocalData();
  const now = useNow(5000);
  if (status !== "ready" || now === 0) return null;
  const fresh = orders.filter(
    ({ order }) =>
      computeOrderState(order.simulation, now) === "VIRTUALLY_DELIVERED" &&
      !settings.dismissedNotices.includes(`delivered:${order.id}`),
  );
  if (fresh.length === 0) return null;

  return (
    <div role="status" className="border-b border-border bg-success text-success-foreground">
      <PageContainer className="flex flex-col gap-1 py-2 text-sm">
        {fresh.map(({ order }) => (
          <div key={order.id} className="flex flex-wrap items-center justify-between gap-2">
            <p>
              {t("notice.delivered", { code: order.code })}{" "}
              <Link href="/collection" className="font-medium underline underline-offset-2">
                {t("notice.open")}
              </Link>
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void dismissNotice(`delivered:${order.id}`)}
            >
              {t("notice.dismiss")}
            </Button>
          </div>
        ))}
      </PageContainer>
    </div>
  );
}
