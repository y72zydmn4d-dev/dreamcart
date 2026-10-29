import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("pages.orders.title") };

export default function OrdersPage() {
  return (
    <PlaceholderPage
      title={t("pages.orders.title")}
      description={t("pages.orders.description")}
      phase={t("pages.orders.phase")}
    />
  );
}
