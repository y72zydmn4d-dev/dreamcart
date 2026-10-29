import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("pages.collection.title") };

export default function CollectionPage() {
  return (
    <PlaceholderPage
      title={t("pages.collection.title")}
      description={t("pages.collection.description")}
      phase={t("pages.collection.phase")}
    />
  );
}
