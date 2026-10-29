import type { ReactNode } from "react";
import { t } from "@/platform/i18n";
import { PageContainer } from "./page-container";

interface PlaceholderPageProps {
  readonly title: string;
  readonly description: string;
  /** Roadmap phase that will build the real feature, for example "8–9". */
  readonly phase: string;
  readonly children?: ReactNode;
}

/** Honest placeholder for a route that real features will replace. Shows no fake product data. */
export function PlaceholderPage({ title, description, phase, children }: PlaceholderPageProps) {
  return (
    <PageContainer className="py-12 sm:py-16">
      <p className="mb-3 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-soft-foreground">
        {t("placeholder.badge")}
      </p>
      <h1 className="text-headline font-semibold">{title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{description}</p>
      <div className="mt-8 max-w-2xl rounded-lg border border-border bg-surface p-6">
        <p>{t("placeholder.body", { phase })}</p>
        <p className="mt-3 text-sm text-muted-foreground">{t("placeholder.noData")}</p>
        {children}
      </div>
    </PageContainer>
  );
}
