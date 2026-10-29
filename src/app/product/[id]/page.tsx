import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { ProductExperience } from "@/components/product/product-experience";
import { FixtureNotice } from "@/components/prototype/fixture-notice";
import { Badge } from "@/components/ui/badge";
import { ChevronRightIcon } from "@/components/ui/icons";
import { parseProductId } from "@/modules/catalog/domain/product-id";
import { t } from "@/platform/i18n";
import { PROTOTYPE_PRODUCTS, findPrototypeProduct } from "@/prototype/catalog";

/**
 * Phase 2: product pages are prerendered from the synthetic prototype catalog only. Every other id
 * is a routing-level 404 (`dynamicParams = false`). Phase 5/6 switches this to the real catalog.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return PROTOTYPE_PRODUCTS.map((p) => ({ id: p.id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = findPrototypeProduct((await params).id);
  return { title: product ? `${product.name} (${t("fixture.badge")})` : t("pages.product.title") };
}

export default async function ProductPage({ params }: Props) {
  const productId = parseProductId((await params).id);
  const product = productId ? findPrototypeProduct(productId) : undefined;
  if (!product) notFound();

  return (
    <PageContainer className="max-w-7xl py-6 sm:py-8">
      <nav aria-label={t("product.breadcrumb")} className="mb-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link
              href="/search"
              className="inline-flex min-h-11 items-center hover:text-foreground"
            >
              {t("product.breadcrumbSearch")}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRightIcon size={16} />
          </li>
          <li>
            <Link
              href={`/search?category=${product.category}`}
              className="inline-flex min-h-11 items-center hover:text-foreground"
            >
              {t(`categories.${product.category}.short`)}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRightIcon size={16} />
          </li>
          <li aria-current="page" className="text-foreground">
            {product.name}
          </li>
        </ol>
      </nav>

      <ProductExperience product={product} />

      <div className="mt-section grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="specs-heading">
          <h2 id="specs-heading" className="text-title font-semibold">
            {t("product.specsHeading")}
          </h2>
          <dl className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface">
            {product.specs.map((spec) => (
              <div
                key={spec.label}
                className="grid grid-cols-[minmax(7rem,40%)_1fr] gap-4 px-5 py-4"
              >
                <dt className="text-muted-foreground">{spec.label}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {t("pages.product.idLabel", { id: product.id })}
          </p>
        </section>
        <section aria-labelledby="source-heading">
          <h2 id="source-heading" className="text-title font-semibold">
            {t("product.sourceHeading")}
          </h2>
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone="fixture">{t("fixture.badge")}</Badge>
              <Badge tone="neutral">{t("fixture.priceLabel")}</Badge>
            </div>
            <p>{t("fixture.source")}</p>
            <p className="text-sm text-muted-foreground">{t("product.sourceBody")}</p>
          </div>
          <FixtureNotice className="mt-4" />
        </section>
      </div>
    </PageContainer>
  );
}
