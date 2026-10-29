import type { Metadata } from "next";
import { CatalogScope } from "@/components/catalog/catalog-scope";
import { CollectionExperience } from "@/components/collection/collection-experience";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("collection.title") };

export default function CollectionPage() {
  return (
    <PageContainer className="max-w-5xl py-8 sm:py-10">
      <h1 className="text-headline font-semibold">{t("collection.title")}</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">{t("collection.lead")}</p>
      <div className="mt-8 min-h-[60dvh]">
        <CatalogScope>
          <CollectionExperience />
        </CatalogScope>
      </div>
    </PageContainer>
  );
}
