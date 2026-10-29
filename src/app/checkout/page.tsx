import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("pages.checkout.title") };

export default function CheckoutPage() {
  return (
    <PlaceholderPage
      title={t("pages.checkout.title")}
      description={t("pages.checkout.description")}
      phase={t("pages.checkout.phase")}
    />
  );
}
