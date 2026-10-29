import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { parseProductId } from "@/modules/catalog/domain/product-id";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("pages.product.title") };

/**
 * Phase 1 has no catalog, so the only prerendered id is a route placeholder, not a product.
 * Every other id is a routing-level 404 (`dynamicParams = false`), with the full site shell.
 * Phase 5/6 replaces this list with real catalog ids.
 */
const PLACEHOLDER_IDS = ["placeholder"] as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return PLACEHOLDER_IDS.map((id) => ({ id }));
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const productId = parseProductId((await params).id);
  if (!productId) notFound();

  return (
    <PlaceholderPage
      title={t("pages.product.title")}
      description={t("pages.product.description")}
      phase={t("pages.product.phase")}
    >
      <p className="mt-3 font-mono text-sm break-all">
        {t("pages.product.idLabel", { id: productId })}
      </p>
    </PlaceholderPage>
  );
}
