import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogScope } from "@/components/catalog/catalog-scope";
import { PageContainer } from "@/components/layout/page-container";
import { attributeLabel, formatAttribute } from "@/components/product/attribute-format";
import { configuratorGroups } from "@/components/product/groups";
import { ProductExperience } from "@/components/product/product-experience";
import { FixtureNotice } from "@/components/prototype/fixture-notice";
import { Badge } from "@/components/ui/badge";
import { ChevronRightIcon } from "@/components/ui/icons";
import { formatDateVi } from "@/lib/format";
import { groupValues } from "@/modules/configurator";
import { parseProductId } from "@/modules/catalog";
import { buildCatalogView } from "@/modules/discovery";
import { getStorefront } from "@/platform/catalog/server";
import { t } from "@/platform/i18n";

/**
 * Product pages are prerendered from the active catalog. Every other id is a routing-level 404
 * (`dynamicParams = false`), so an unknown or malformed id can never reach the page.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const { active } = await getStorefront();
  return active.catalog.products.map((p) => ({ id: p.id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { active } = await getStorefront();
  const { id } = await params;
  const product = active.catalog.products.find((p) => p.id === id);
  if (!product) return { title: t("pages.product.title") };
  return {
    title:
      active.mode === "synthetic" ? `${product.titleVi} (${t("fixture.badge")})` : product.titleVi,
    description: product.summaryVi.slice(0, 160),
  };
}

export default async function ProductPage({ params }: Props) {
  const productId = parseProductId((await params).id);
  const { active, builtAtMs } = await getStorefront();
  const view = buildCatalogView(active.catalog, builtAtMs);
  const product = productId ? view.byId.get(productId) : undefined;
  if (!product) notFound();
  const synthetic = active.mode === "synthetic";
  const vocabulary = active.catalog.vocabulary;
  const groups = configuratorGroups(product);
  const sourceNames = [
    ...new Set(product.variants.flatMap((v) => v.offers.map((o) => o.source.name))),
  ];
  const observed = product.variants
    .flatMap((v) => v.offers.flatMap((o) => (o.offer.price ? [o.offer.price.observedAt] : [])))
    .sort();

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
              href={`/search?category=${product.product.category}`}
              className="inline-flex min-h-11 items-center hover:text-foreground"
            >
              {t(`categories.${product.product.category}.short`)}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRightIcon size={16} />
          </li>
          <li aria-current="page" className="text-foreground">
            {product.product.titleVi}
          </li>
        </ol>
      </nav>

      <CatalogScope>
        <ProductExperience productId={product.product.id} />
      </CatalogScope>

      <div className="mt-section grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="specs-heading">
          <h2 id="specs-heading" className="text-title font-semibold">
            {t("product.specsHeading")}
          </h2>
          <dl className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface">
            <SpecRow label={attributeLabel("brand")} value={product.product.brand} />
            <SpecRow
              label={attributeLabel("family")}
              value={[product.product.family, product.product.model].filter(Boolean).join(" ")}
            />
            {groups.map((key) => {
              const values = groupValues(
                product.variants.map((v) => ({
                  id: v.variant.id,
                  attributes: v.variant.attributes,
                })),
                key,
              );
              return (
                <SpecRow
                  key={key}
                  label={attributeLabel(key)}
                  value={values.map((v) => formatAttribute(key, v, vocabulary)).join(", ")}
                />
              );
            })}
            {(product.product.facts ?? []).map((fact) => (
              <SpecRow
                key={fact.key}
                label={fact.labelVi}
                value={`${fact.value}${fact.unit ? ` ${fact.unit}` : ""}`}
              />
            ))}
          </dl>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {t("pages.product.idLabel", { id: product.product.id })}
          </p>
        </section>
        <section aria-labelledby="source-heading">
          <h2 id="source-heading" className="text-title font-semibold">
            {t("product.sourceHeading")}
          </h2>
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
            {synthetic ? (
              <div className="flex flex-wrap gap-2">
                <Badge tone="fixture">{t("fixture.badge")}</Badge>
                <Badge tone="neutral">{t("fixture.priceLabel")}</Badge>
              </div>
            ) : null}
            {sourceNames.length > 0 ? (
              <p>
                {t("price.source", { name: sourceNames.join(", ") })}
                {observed.length > 0
                  ? ` · ${t("price.observedOn", { date: formatDateVi(observed[observed.length - 1]!) })}`
                  : ""}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">{t("product.sourceBody")}</p>
            <p className="text-sm text-muted-foreground">{t("product.unverifiedNote")}</p>
          </div>
          {synthetic ? <FixtureNotice className="mt-4" /> : null}
        </section>
      </div>
    </PageContainer>
  );
}

function SpecRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,40%)_1fr] gap-4 px-5 py-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
