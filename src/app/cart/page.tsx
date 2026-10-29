import type { Metadata } from "next";
import { CatalogScope } from "@/components/catalog/catalog-scope";
import { CartExperience } from "@/components/cart/cart-experience";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("pages.cart.title") };

export default function CartPage() {
  return (
    <PageContainer className="max-w-6xl py-8 sm:py-10">
      <h1 className="text-headline font-semibold">{t("cart.title")}</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">{t("cart.lead")}</p>
      <div className="mt-8 min-h-[60dvh]">
        <CatalogScope>
          <CartExperience />
        </CatalogScope>
      </div>
    </PageContainer>
  );
}
