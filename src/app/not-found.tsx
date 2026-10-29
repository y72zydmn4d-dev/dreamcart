import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/platform/i18n";

export default function NotFound() {
  return (
    <PageContainer className="py-section">
      <h1 className="text-headline font-semibold">{t("notFound.title")}</h1>
      <p className="mt-3 max-w-xl text-lg text-muted-foreground">{t("notFound.body")}</p>
      <Link href="/" className={buttonVariants({ className: "mt-8" })}>
        {t("notFound.backHome")}
      </Link>
    </PageContainer>
  );
}
