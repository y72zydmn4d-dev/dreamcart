import type { Metadata } from "next";
import { CatalogScope } from "@/components/catalog/catalog-scope";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("checkout.title") };

export default function CheckoutPage() {
  return (
    <PageContainer className="max-w-6xl py-8 sm:py-10">
      <h1 className="text-headline font-semibold">{t("checkout.title")}</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">{t("checkout.lead")}</p>
      <div className="mt-8">
        <CatalogScope>
          <CheckoutExperience />
        </CatalogScope>
      </div>
    </PageContainer>
  );
}
