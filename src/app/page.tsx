import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { ProductArt } from "@/components/product/product-art";
import { ProductCard } from "@/components/product/product-card";
import { FixtureNotice } from "@/components/prototype/fixture-notice";
import { SearchBox } from "@/components/search/search-box";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeftIcon, BagIcon, PackageIcon, SearchIcon, SparkIcon } from "@/components/ui/icons";
import { t, type DictionaryKey } from "@/platform/i18n";
import { CATEGORIES, PROTOTYPE_PRODUCTS, type ArtKind, type Category } from "@/prototype/catalog";

const CATEGORY_ART: Record<Category, ArtKind> = {
  laptop: "laptop",
  phone: "phone",
  audio: "headphones",
};

const HOW: readonly {
  key: "discover" | "cart" | "checkout" | "collect";
  Icon: typeof SearchIcon;
}[] = [
  { key: "discover", Icon: SearchIcon },
  { key: "cart", Icon: BagIcon },
  { key: "checkout", Icon: SparkIcon },
  { key: "collect", Icon: PackageIcon },
];

export default function HomePage() {
  const featured = PROTOTYPE_PRODUCTS.filter((p) => p.featured);

  return (
    <>
      {/* Editorial hero: type-led, original brand glow, search as the primary action. */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_20%_10%,var(--glow-1),transparent_70%),radial-gradient(50%_70%_at_85%_0%,var(--glow-2),transparent_70%),radial-gradient(60%_60%_at_60%_100%,var(--glow-3),transparent_70%)]"
        />
        <PageContainer className="flex flex-col items-center pt-16 pb-20 text-center sm:pt-24 sm:pb-28">
          <p className="text-sm font-medium text-accent">{t("home.eyebrow")}</p>
          <h1 className="mt-4 max-w-4xl text-hero font-semibold">{t("home.title")}</h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            {t("home.subtitle")}
          </p>
          <SearchBox size="hero" className="mt-10 max-w-2xl text-left" />
          <nav aria-label={t("home.quickLinks")} className="mt-5">
            <ul className="flex flex-wrap justify-center gap-2">
              {CATEGORIES.map((c) => (
                <li key={c}>
                  <Link
                    href={`/search?category=${c}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface/80 px-4 text-sm hover:border-border-strong"
                  >
                    {t(`categories.${c}.short`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mt-8 text-sm text-muted-foreground">{t("home.disclosure")}</p>
        </PageContainer>
      </section>

      <PageContainer className="flex flex-col gap-section pb-8">
        <FixtureNotice />

        <section aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="text-headline font-semibold">
            {t("home.categoriesHeading")}
          </h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <Link
                  href={`/search?category=${c}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-shadow duration-(--duration-base) hover:shadow-float"
                >
                  <div className="bg-art-stage">
                    <ProductArt kind={CATEGORY_ART[c]} label={t(`categories.${c}.name`)} />
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-6">
                    <h3 className="text-title font-semibold">{t(`categories.${c}.name`)}</h3>
                    <p className="text-muted-foreground">{t(`categories.${c}.blurb`)}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent">
                      {t("home.categoriesCta", { category: t(`categories.${c}.short`) })}
                      <ArrowLeftIcon
                        size={16}
                        className="rotate-180 transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="featured-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="featured-heading" className="text-headline font-semibold">
                {t("home.featuredHeading")}
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">{t("home.featuredLead")}</p>
            </div>
            <Link href="/search" className={buttonVariants({ variant: "outline" })}>
              {t("home.featuredAll")}
            </Link>
          </div>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how-heading">
          <h2 id="how-heading" className="text-headline font-semibold">
            {t("home.howHeading")}
          </h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW.map(({ key, Icon }, index) => (
              <li key={key} className="rounded-2xl bg-muted p-6">
                <span className="flex size-11 items-center justify-center rounded-full bg-surface text-accent shadow-card">
                  <Icon />
                </span>
                <h3 className="mt-4 font-semibold">
                  <span className="sr-only">{index + 1}. </span>
                  {t(`home.how.${key}.title` as DictionaryKey)}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`home.how.${key}.body` as DictionaryKey)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="trust-heading"
          className="rounded-2xl border border-simulation-border bg-simulation p-8 text-simulation-foreground sm:p-10"
        >
          <h2 id="trust-heading" className="text-title font-semibold">
            {t("home.trustHeading")}
          </h2>
          <p className="mt-2 max-w-2xl">{t("home.trustBody")}</p>
          <Link
            href="/about"
            className="mt-4 inline-flex min-h-11 items-center font-medium underline underline-offset-2"
          >
            {t("home.trustCta")}
          </Link>
        </section>
      </PageContainer>
    </>
  );
}
