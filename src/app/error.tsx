"use client";

import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { t } from "@/platform/i18n";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageContainer className="py-section">
      <h1 className="text-headline font-semibold">{t("error.title")}</h1>
      <p className="mt-3 max-w-xl text-lg text-muted-foreground">{t("error.body")}</p>
      <Button className="mt-8" onClick={reset}>
        {t("error.retry")}
      </Button>
    </PageContainer>
  );
}
