import { formatDateVi } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/platform/i18n";
import type { PriceState } from "@/modules/pricing";

interface PriceNoteProps {
  readonly observedAt: string;
  readonly state: PriceState;
  /** Synthetic fixtures call themselves "Giá mẫu" instead of pretending to be an observation. */
  readonly synthetic: boolean;
  readonly className?: string;
}

/**
 * The provenance line that sits under every price: what kind of figure it is, when it was observed, and a
 * warning when it is old. A price is never shown without this line.
 */
export function PriceNote({ observedAt, state, synthetic, className }: PriceNoteProps) {
  return (
    <span
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <span>
        {synthetic ? t("fixture.priceLabel") : t("price.reference")} ·{" "}
        {t("price.observedOn", { date: formatDateVi(observedAt) })}
      </span>
      {state === "STALE" || state === "EXPIRED" ? (
        <span className="rounded-full bg-warning px-2 py-0.5 font-medium text-warning-foreground">
          {t("price.staleWarning")}
        </span>
      ) : null}
    </span>
  );
}
