"use client";

import { InfoIcon } from "@/components/ui/icons";
import { t } from "@/platform/i18n";
import { PageContainer } from "@/components/layout/page-container";
import { useLocalData } from "./local-data";

/**
 * Local data problems are never silent: working only in memory, a database this build cannot open, or records that
 * had to be set aside. Rendered once, under the header, on every page.
 */
export function StorageNotice() {
  const { status, failure, degraded, quarantined } = useLocalData();
  const messages: string[] = [];
  if (status === "failed") {
    messages.push(t(`storage.failed.${failure ?? "unknown"}`));
  } else if (degraded) {
    messages.push(
      t("storage.degraded", {
        reason: t(
          `storage.degradedReasons.${degraded === "unavailable" || degraded === "quota_exceeded" ? degraded : "other"}`,
        ),
      }),
    );
  }
  if (quarantined.length > 0)
    messages.push(t("storage.quarantined", { count: quarantined.length }));
  if (messages.length === 0) return null;

  return (
    <div role="alert" className="border-b border-border bg-warning text-warning-foreground">
      <PageContainer className="flex flex-col gap-1 py-2 text-sm">
        {messages.map((m) => (
          <p key={m} className="flex items-start gap-2">
            <InfoIcon size={18} className="mt-0.5 shrink-0" />
            <span>{m}</span>
          </p>
        ))}
      </PageContainer>
    </div>
  );
}
