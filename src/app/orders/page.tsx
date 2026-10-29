import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { OrdersExperience } from "@/components/orders/orders-experience";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("orders.title") };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { deleted } = await searchParams;
  return (
    <PageContainer className="max-w-4xl py-8 sm:py-10">
      <h1 className="text-headline font-semibold">{t("orders.title")}</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">{t("orders.lead")}</p>
      <div className="mt-8 min-h-[60dvh]">
        <OrdersExperience deleted={deleted === "1"} />
      </div>
    </PageContainer>
  );
}
