import Link from "next/link";
import { t } from "@/platform/i18n";
import { PageContainer } from "./page-container";

/** Always-visible disclosure that every transaction is simulated. Not dismissible by design. */
export function SimulationBanner() {
  return (
    <div
      role="region"
      aria-label={t("simulation.regionLabel")}
      className="border-b border-simulation-border bg-simulation text-simulation-foreground"
    >
      <PageContainer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-sm">
        <p className="font-medium">{t("simulation.notice")}</p>
        <Link
          href="/about"
          className="relative rounded-sm underline underline-offset-2 after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']"
        >
          {t("simulation.learnMore")}
        </Link>
      </PageContainer>
    </div>
  );
}
