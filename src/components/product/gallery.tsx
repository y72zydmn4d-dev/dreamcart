"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { t } from "@/platform/i18n";
import type { ArtKind } from "@/prototype/catalog";
import { ProductArt, type ArtView } from "./product-art";

const VIEWS: readonly ArtView[] = ["front", "side", "detail"];

interface GalleryProps {
  readonly kind: ArtKind;
  readonly name: string;
  readonly color?: string;
  readonly colorLabel?: string;
}

/** Large stage plus thumbnails. The color follows the configurator selection (data-backed only). */
export function Gallery({ kind, name, color, colorLabel }: GalleryProps) {
  const [view, setView] = useState<ArtView>("front");
  const label = colorLabel
    ? t("art.label", { name, color: colorLabel })
    : t("art.labelNoColor", { name });

  return (
    <section aria-label={t("product.gallery")} className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl bg-art-stage">
        <ProductArt
          key={`${view}-${color}`}
          kind={kind}
          view={view}
          color={color}
          label={label}
          className="animate-fade-up"
        />
      </div>
      <div className="grid grid-cols-3 gap-3" role="group" aria-label={t("product.gallery")}>
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            aria-label={t("product.viewLabel", { view: t(`product.views.${v}`) })}
            onClick={() => setView(v)}
            className={cn(
              "cursor-pointer overflow-hidden rounded-xl border-2 bg-art-stage transition-colors",
              view === v ? "border-accent" : "border-transparent hover:border-border-strong",
            )}
          >
            <ProductArt kind={kind} view={v} color={color} className="pointer-events-none" />
          </button>
        ))}
      </div>
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge tone="fixture">{t("fixture.badge")}</Badge>
        {t("fixture.artCaption")}
      </p>
    </section>
  );
}
