import type { Metadata } from "next";
import {
  CartLinePreview,
  CheckoutPreview,
  CollectionCardPreview,
  OrderCardPreview,
  PriceStatesPreview,
  TrackingPreview,
} from "@/components/foundations/foundation-previews";
import { PageContainer } from "@/components/layout/page-container";
import { ProductCard } from "@/components/product/product-card";
import { FixtureNotice } from "@/components/prototype/fixture-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/platform/i18n";
import { buildCatalogView } from "@/modules/discovery";
import { getStorefront } from "@/platform/catalog/server";
import { SearchStatesGallery } from "@/components/foundations/search-states-gallery";

export const metadata: Metadata = { title: t("design.title") };

const SWATCHES = [
  ["background", "bg-background"],
  ["surface", "bg-surface"],
  ["muted", "bg-muted"],
  ["border", "bg-border"],
  ["foreground", "bg-foreground"],
  ["accent", "bg-accent"],
  ["accent-soft", "bg-accent-soft"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["simulation", "bg-simulation"],
  ["destructive", "bg-destructive"],
  ["art-stage", "bg-art-stage"],
] as const;

const TYPE_SCALE = [
  ["text-hero", "Mua sắm cảm xúc"],
  ["text-display", "Fixturia Aero"],
  ["text-headline", "Khám phá theo danh mục"],
  ["text-title", "Cấu hình của bạn"],
  ["text-base", "Chọn đúng dung lượng và màu sắc bạn thích. Tiếng Việt có dấu: ễ ổ ữ Ặ."],
  ["text-sm", "Giá mẫu · dữ liệu thử nghiệm"],
] as const;

/** Living reference for tokens and components (prototype; not linked from primary navigation). */
export default async function DesignPage() {
  const { active, builtAtMs } = await getStorefront();
  const sample = buildCatalogView(active.catalog, builtAtMs).products[0]!;
  return (
    <PageContainer className="flex max-w-7xl flex-col gap-section py-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-display font-semibold">{t("design.title")}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t("design.lead")}</p>
        {active.mode === "synthetic" ? <FixtureNotice /> : null}
      </header>

      <section aria-labelledby="colors-heading">
        <h2 id="colors-heading" className="text-headline font-semibold">
          {t("design.colorsHeading")}
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {SWATCHES.map(([name, className]) => (
            <li key={name} className="flex flex-col gap-2">
              <span
                className={`h-16 rounded-xl border border-border ${className}`}
                aria-hidden="true"
              />
              <code className="text-xs text-muted-foreground">--{name}</code>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="type-heading">
        <h2 id="type-heading" className="text-headline font-semibold">
          {t("design.typeHeading")}
        </h2>
        <ul className="mt-6 flex flex-col gap-4">
          {TYPE_SCALE.map(([className, text]) => (
            <li key={className} className="flex flex-col gap-1 border-b border-border pb-4">
              <code className="text-xs text-muted-foreground">{className}</code>
              <p className={`${className} font-semibold`}>{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="components-heading">
        <h2 id="components-heading" className="text-headline font-semibold">
          {t("design.componentsHeading")}
        </h2>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button>{t("configurator.addToCart")}</Button>
          <Button variant="secondary">{t("home.featuredAll")}</Button>
          <Button variant="outline">{t("search.filters.title")}</Button>
          <Button variant="ghost">{t("configurator.reset")}</Button>
          <Button disabled>{t("design.checkoutConfirm")}</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="fixture">{t("fixture.badge")}</Badge>
          <Badge tone="simulation">{t("simulation.regionLabel")}</Badge>
          <Badge tone="accent">{t("orderStates.inTransit")}</Badge>
          <Badge tone="success">{t("orderStates.delivered")}</Badge>
          <Badge tone="warning">{t("priceStates.stale", { date: "01/09/2026" })}</Badge>
        </div>
        <div className="mt-6 max-w-xs">
          <ProductCard product={sample} synthetic={active.mode === "synthetic"} />
        </div>
      </section>

      <section aria-labelledby="states-heading">
        <h2 id="states-heading" className="text-headline font-semibold">
          {t("design.statesHeading")}
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("design.statesLead")}</p>
        <SearchStatesGallery />
      </section>

      <section aria-labelledby="foundations-heading">
        <h2 id="foundations-heading" className="text-headline font-semibold">
          {t("design.foundationsHeading")}
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("design.foundationsLead")}</p>
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <CartLinePreview />
          <CheckoutPreview />
          <OrderCardPreview />
          <TrackingPreview />
          <CollectionCardPreview />
          <PriceStatesPreview />
        </div>
      </section>
    </PageContainer>
  );
}
