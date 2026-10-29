import Link from "next/link";
import { SearchIcon } from "@/components/ui/icons";
import { t } from "@/platform/i18n";
import { MainNav } from "./main-nav";
import { MobileNav } from "./mobile-nav";
import { PageContainer } from "./page-container";
import { SimulationBanner } from "./simulation-banner";

/**
 * Sticky from `md` up so the disclosure and navigation stay visible while scrolling. On phones the
 * header is one compact row (brand, search, menu) that scrolls away; the notice is still first on
 * every page.
 */
export function SiteHeader() {
  return (
    <header className="z-40 bg-background/85 backdrop-blur-md md:sticky md:top-0">
      <SimulationBanner />
      <div className="border-b border-border">
        <PageContainer className="flex min-h-14 items-center justify-between gap-x-6 py-1.5">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-lg font-semibold tracking-tight"
          >
            <span
              aria-hidden="true"
              className="size-6 rounded-lg bg-[conic-gradient(from_210deg,var(--accent),var(--accent-2),var(--accent))]"
            />
            {t("brand.name")}
          </Link>
          <div className="flex items-center gap-1">
            <div className="hidden md:block">
              <MainNav />
            </div>
            <Link
              href="/search"
              aria-label={t("nav.search")}
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-muted md:hidden"
            >
              <SearchIcon />
            </Link>
            <MobileNav />
          </div>
        </PageContainer>
      </div>
    </header>
  );
}
