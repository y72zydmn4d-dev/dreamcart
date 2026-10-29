import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { SettingsExperience } from "@/components/settings/settings-experience";
import { t } from "@/platform/i18n";

export const metadata: Metadata = { title: t("settings.title") };

export default function SettingsPage() {
  return (
    <PageContainer className="max-w-4xl py-8 sm:py-10">
      <h1 className="text-headline font-semibold">{t("settings.title")}</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">{t("settings.lead")}</p>
      <div className="mt-8">
        <SettingsExperience />
      </div>
    </PageContainer>
  );
}
