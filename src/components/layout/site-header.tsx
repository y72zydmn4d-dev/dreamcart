import Link from "next/link";
import { t } from "@/platform/i18n";
import { MainNav } from "./main-nav";
import { PageContainer } from "./page-container";
import { SimulationBanner } from "./simulation-banner";

/**
 * Sticky from `md` up so the disclosure and navigation stay visible while scrolling. On phones the
 * stacked banner and navigation would take about a third of the screen, so there it scrolls away
 * (the notice is still the first thing on every page).
 */
export function SiteHeader() {
  return (
    <header className="z-40 bg-background/90 backdrop-blur md:sticky md:top-0">
      <SimulationBanner />
      <div className="border-b border-border">
        <PageContainer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full px-1 text-lg font-semibold tracking-tight"
          >
            {t("brand.name")}
          </Link>
          <MainNav />
        </PageContainer>
      </div>
    </header>
  );
}
