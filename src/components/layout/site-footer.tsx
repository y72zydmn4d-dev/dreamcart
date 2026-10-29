import Link from "next/link";
import { t } from "@/platform/i18n";
import { PageContainer } from "./page-container";

export function SiteFooter() {
  return (
    <footer className="mt-section border-t border-border bg-muted">
      <PageContainer className="flex flex-col gap-2 py-8 text-sm text-muted-foreground">
        <p>{t("footer.disclosure")}</p>
        <p>{t("footer.status")}</p>
        <p>
          <Link href="/about" className="rounded-sm underline underline-offset-2">
            {t("simulation.learnMore")}
          </Link>
        </p>
      </PageContainer>
    </footer>
  );
}
