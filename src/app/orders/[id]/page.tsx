import type { Metadata } from "next";
import { CatalogScope } from "@/components/catalog/catalog-scope";
import { PageContainer } from "@/components/layout/page-container";
import { OrderDetail } from "@/components/orders/order-detail";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("orders.code") };

/** Rendered on demand: order ids exist only in the visitor's own browser. */
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { placed } = await searchParams;
  return (
    <PageContainer className="max-w-4xl py-8 sm:py-10">
      <h1 className="text-headline font-semibold">{t("orders.title")}</h1>
      <div className="mt-8 min-h-[60dvh]">
        <CatalogScope>
          <OrderDetail id={id} placed={placed === "1"} />
        </CatalogScope>
      </div>
    </PageContainer>
  );
}
