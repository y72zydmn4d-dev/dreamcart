import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("pages.search.title") };

export default function SearchPage() {
  return (
    <PlaceholderPage
      title={t("pages.search.title")}
      description={t("pages.search.description")}
      phase={t("pages.search.phase")}
    />
  );
}
