import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { buttonVariants } from "@/components/ui/button";
import { t, type DictionaryKey } from "@/platform/i18n";

const JOURNEY_STEPS: readonly DictionaryKey[] = [
  "home.journey.discover",
  "home.journey.search",
  "home.journey.configure",
  "home.journey.addToCart",
  "home.journey.checkout",
  "home.journey.order",
  "home.journey.delivery",
  "home.journey.collection",
];

export default function HomePage() {
  return (
    <PageContainer className="py-section">
      <p className="text-sm font-medium text-accent">{t("home.eyebrow")}</p>
      <h1 className="mt-4 max-w-3xl text-display font-semibold">{t("home.title")}</h1>
      <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{t("home.subtitle")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/search" className={buttonVariants({ size: "lg" })}>
          {t("home.ctaSearch")}
        </Link>
        <Link href="/about" className={buttonVariants({ variant: "secondary", size: "lg" })}>
          {t("home.ctaAbout")}
        </Link>
      </div>

      <section aria-labelledby="journey-heading" className="mt-section">
        <h2 id="journey-heading" className="text-xl font-semibold">
          {t("home.journeyHeading")}
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {JOURNEY_STEPS.map((key, index) => (
            <li
              key={key}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent-soft-foreground"
              >
                {index + 1}
              </span>
              <span>{t(key)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="status-heading"
        className="mt-section max-w-2xl rounded-xl border border-border bg-muted p-6"
      >
        <h2 id="status-heading" className="text-lg font-semibold">
          {t("home.statusHeading")}
        </h2>
        <p className="mt-2 text-muted-foreground">{t("home.statusBody")}</p>
      </section>
    </PageContainer>
  );
}
