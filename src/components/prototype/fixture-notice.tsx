import { Badge } from "@/components/ui/badge";
import { InfoIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { t } from "@/platform/i18n";

/** Shown on every prototype surface that displays synthetic Fixturia data. */
export function FixtureNotice({ className }: { readonly className?: string }) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-dashed border-border-strong bg-surface px-4 py-2.5 text-sm text-muted-foreground",
        className,
      )}
    >
      <InfoIcon size={18} className="shrink-0" />
      <Badge tone="fixture">{t("fixture.badge")}</Badge>
      <span>{t("fixture.notice")}</span>
    </p>
  );
}
