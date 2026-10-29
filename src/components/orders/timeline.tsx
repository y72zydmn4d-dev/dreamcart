import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  ORDER_PROGRESS,
  stateWhenCancelled,
  type OrderState,
  type ProgressState,
  type VirtualOrder,
} from "@/modules/orders";
import { t } from "@/platform/i18n";
import { stateLabel } from "./state-label";

const time = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/**
 * The simulated journey: six virtual states, in the order's own scenario. A timed scenario shows when each step is
 * expected; the manual one shows none, because nothing happens until the user presses the button. A cancelled order
 * keeps the steps it reached and ends in "cancelled". Nothing here names a carrier or a tracking number.
 */
export function OrderTimeline({
  order,
  state,
}: {
  readonly order: VirtualOrder;
  readonly state: OrderState;
}) {
  const { simulation } = order;
  const cancelledFrom = stateWhenCancelled(simulation);
  const reached: ProgressState | null = state === "CANCELLED" ? cancelledFrom : state;
  const reachedIndex = reached ? ORDER_PROGRESS.indexOf(reached) : -1;
  const offsets = simulation.scenario.milestoneOffsetsMs;

  return (
    <section aria-labelledby="tracking-heading" className="flex flex-col gap-3">
      <h2 id="tracking-heading" className="text-title font-semibold">
        {t("tracking.heading")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("tracking.note")}</p>
      <ol aria-label={t("tracking.label")} className="flex flex-col">
        {ORDER_PROGRESS.map((step, i) => {
          const status = i < reachedIndex ? "done" : i === reachedIndex ? "current" : "upcoming";
          const cancelledHere = state === "CANCELLED";
          const offset = offsets[i];
          return (
            <li
              key={step}
              aria-current={status === "current" && !cancelledHere ? "step" : undefined}
              data-status={cancelledHere && status === "current" ? "done" : status}
              className="flex gap-3"
            >
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                    status === "upcoming" && "border-border-strong bg-surface",
                    status === "current" &&
                      !cancelledHere &&
                      "border-accent bg-accent text-accent-foreground",
                    (status === "done" || (status === "current" && cancelledHere)) &&
                      "border-accent bg-accent-soft text-accent-soft-foreground",
                  )}
                >
                  {status !== "upcoming" ? <CheckIcon size={14} /> : null}
                </span>
                {i < ORDER_PROGRESS.length - 1 || cancelledHere ? (
                  <span aria-hidden="true" className="min-h-6 w-0.5 flex-1 bg-border-strong" />
                ) : null}
              </div>
              <div className="pb-4">
                <p className={cn("font-medium", status === "upcoming" && "text-muted-foreground")}>
                  {stateLabel(step)}
                  <span className="sr-only">
                    {" — "}
                    {cancelledHere && status === "current"
                      ? t("tracking.done")
                      : t(`tracking.${status}`)}
                  </span>
                </p>
                {offset !== undefined && status !== "done" && !cancelledHere ? (
                  <p className="text-sm text-muted-foreground">
                    {t("tracking.expected", {
                      time: time.format(simulation.scenario.startedAtMs + offset),
                    })}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
        {state === "CANCELLED" ? (
          <li className="flex gap-3" data-status="cancelled" aria-current="step">
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-muted"
            >
              ×
            </span>
            <div>
              <p className="font-medium">{stateLabel("CANCELLED")}</p>
              {cancelledFrom ? (
                <p className="text-sm text-muted-foreground">
                  {t("tracking.cancelledAt", { state: stateLabel(cancelledFrom) })}
                </p>
              ) : null}
            </div>
          </li>
        ) : null}
      </ol>
    </section>
  );
}
