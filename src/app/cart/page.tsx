import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("pages.cart.title") };

export default function CartPage() {
  return (
    <PlaceholderPage
      title={t("pages.cart.title")}
      description={t("pages.cart.description")}
      phase={t("pages.cart.phase")}
    />
  );
}
