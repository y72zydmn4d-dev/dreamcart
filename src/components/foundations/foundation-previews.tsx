import { ProductArt } from "@/components/product/product-art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t, type DictionaryKey } from "@/platform/i18n";
import { COLOR_SWATCHES } from "@/prototype/catalog";

/**
 * Static design foundations for Phases 7–9 (cart, checkout, orders, tracking, collection). They show
 * the visual language only: no state, no persistence, no real or simulated transaction happens here.
 */

function PreviewFrame({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-sm font-medium text-muted-foreground">{title}</figcaption>
      <div className="rounded-2xl border border-border bg-surface p-5">{children}</div>
    </figure>
  );
}

export function CartLinePreview() {
  return (
    <PreviewFrame title={t("design.cartTitle")}>
      <div className="flex gap-4">
        <div className="w-24 shrink-0 overflow-hidden rounded-xl bg-art-stage">
          <ProductArt
            kind="laptop"
            color={COLOR_SWATCHES.silver}
            label={t("art.labelNoColor", { name: "Fixturia Aero" })}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">Fixturia Aero</p>
            <Badge tone="fixture">{t("fixture.badge")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">13 inch · FX2 · 16 GB · 512 GB</p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">{t("design.quantity", { count: 1 })}</p>
            <p className="font-semibold">{formatVnd(33990000)}</p>
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}

export function CheckoutPreview() {
  return (
    <PreviewFrame title={t("design.checkoutTitle")}>
      <div className="flex flex-col gap-3">
        <p className="rounded-lg bg-simulation px-3 py-2 text-sm text-simulation-foreground">
          {t("simulation.notice")}
        </p>
        <p className="text-sm">{t("design.destination")}</p>
        <p className="text-sm">{t("design.payment")}</p>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-muted-foreground">{t("design.subtotal")}</span>
          <span className="font-semibold">{formatVnd(33990000)}</span>
        </div>
        <p className="flex items-start gap-2 text-sm">
          <span
            className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded border border-border-strong"
            aria-hidden="true"
          />
          {t("design.checkoutAck")}
        </p>
        <Button disabled className="w-full">
          {t("design.checkoutConfirm")}
        </Button>
      </div>
    </PreviewFrame>
  );
}

export function OrderCardPreview() {
  return (
    <PreviewFrame title={t("design.ordersTitle")}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-sm">{t("design.orderCode", { code: "DC-V-MAU0000001" })}</p>
          <Badge tone="accent">{t("orderStates.inTransit")}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Fixturia Nova 5 · 256 GB · Cát</p>
        <p className="font-semibold">{formatVnd(21990000)}</p>
      </div>
    </PreviewFrame>
  );
}

const TIMELINE: readonly DictionaryKey[] = [
  "orderStates.confirmed",
  "orderStates.preparing",
  "orderStates.packed",
  "orderStates.inTransit",
  "orderStates.outForDelivery",
  "orderStates.delivered",
];

export function TrackingPreview({ current = 3 }: { readonly current?: number }) {
  return (
    <PreviewFrame title={t("design.trackingTitle")}>
      <ol className="flex flex-col">
        {TIMELINE.map((key, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border-2",
                    done && "border-accent bg-accent text-accent-foreground",
                    active && "border-accent bg-accent-soft",
                    !done && !active && "border-border-strong bg-surface",
                  )}
                  aria-hidden="true"
                >
                  {done ? <CheckIcon size={14} /> : null}
                </span>
                {index < TIMELINE.length - 1 ? (
                  <span
                    className={cn("w-0.5 flex-1", done ? "bg-accent" : "bg-border")}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <p
                className={cn(
                  "pb-5 text-sm",
                  active ? "font-semibold" : done ? "" : "text-muted-foreground",
                )}
              >
                {t(key)}
              </p>
            </li>
          );
        })}
      </ol>
    </PreviewFrame>
  );
}

export function CollectionCardPreview() {
  return (
    <PreviewFrame title={t("design.collectionTitle")}>
      <div className="overflow-hidden rounded-xl bg-art-stage">
        <ProductArt
          kind="headphones"
          color={COLOR_SWATCHES.silver}
          label={t("art.labelNoColor", { name: "Fixturia Studio 700" })}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Fixturia Studio 700</p>
        <Badge tone="success">{t("design.collectionDelivered", { date: "29/10/2026" })}</Badge>
      </div>
    </PreviewFrame>
  );
}

export function PriceStatesPreview() {
  return (
    <PreviewFrame title={t("design.priceStatesTitle")}>
      <div className="flex flex-wrap gap-2">
        <Badge tone="neutral">{t("priceStates.observed", { date: "20/10/2026" })}</Badge>
        <Badge tone="warning">{t("priceStates.stale", { date: "01/09/2026" })}</Badge>
        <Badge tone="accent">{t("priceStates.userEntered")}</Badge>
        <Badge tone="neutral">{t("priceStates.unavailable")}</Badge>
      </div>
    </PreviewFrame>
  );
}
