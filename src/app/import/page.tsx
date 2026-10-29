import type { Metadata } from "next";
import { ImportExperience } from "@/components/import/import-experience";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("importPage.title") };

export default function ImportPage() {
  return (
    <PageContainer className="max-w-6xl py-8 sm:py-10">
      <h1 className="text-headline font-semibold">{t("importPage.title")}</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">{t("importPage.lead")}</p>
      <div className="mt-8">
        <ImportExperience />
      </div>
    </PageContainer>
  );
}
