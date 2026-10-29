"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductView } from "@/modules/discovery";
import { t } from "@/platform/i18n";
import { artKindFor } from "./art-kind";
import { ProductArt, type ArtView } from "./product-art";

const VIEWS: readonly ArtView[] = ["front", "side", "detail"];

interface GalleryProps {
  readonly product: ProductView;
  readonly color?: string;
  readonly colorLabel?: string;
  readonly synthetic: boolean;
}

/**
 * Large stage plus thumbnails. With cleared photographs it shows those (with their credit); without, it shows
 * the designed placeholder and says so. The placeholder tint follows the configurator's color (a vocabulary
 * swatch, never a claim about the real product).
 */
export function Gallery({ product, color, colorLabel, synthetic }: GalleryProps) {
  const [view, setView] = useState<ArtView>("front");
  const [index, setIndex] = useState(0);
  const name = product.product.titleVi;
  const images = product.images;

  if (images.length > 0) {
    const current = images[Math.min(index, images.length - 1)]!;
    return (
      <section aria-label={t("product.gallery")} className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-2xl bg-art-stage">
          {/* eslint-disable-next-line @next/next/no-img-element -- self-hosted, size known */}
          <img
            src={`/${current.file.replace(/^\//, "")}`}
            alt={current.altVi}
            width={current.width}
            height={current.height}
            decoding="async"
            className="animate-fade-up block h-auto w-full object-contain"
          />
        </div>
        {images.length > 1 ? (
          <div className="grid grid-cols-4 gap-3" role="group" aria-label={t("product.gallery")}>
            {images.map((image, i) => (
              <button
                key={image.id}
                type="button"
                aria-pressed={i === index}
                aria-label={t("product.viewLabel", { view: image.altVi })}
                onClick={() => setIndex(i)}
                className={cn(
                  "min-h-11 cursor-pointer overflow-hidden rounded-xl border-2 bg-art-stage transition-colors",
                  i === index ? "border-accent" : "border-transparent hover:border-border-strong",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative thumbnail inside a labeled button */}
                <img
                  src={`/${image.file.replace(/^\//, "")}`}
                  alt=""
                  width={image.width}
                  height={image.height}
                  loading="lazy"
                  decoding="async"
                  className="pointer-events-none block h-auto w-full object-contain"
                />
              </button>
            ))}
          </div>
        ) : null}
        {current.rights.attributionText ? (
          <p className="text-sm text-muted-foreground">
            {t("product.imageCredit", { credit: current.rights.attributionText })}
          </p>
        ) : null}
      </section>
    );
  }

  const kind = artKindFor(product);
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
        {synthetic ? <Badge tone="fixture">{t("fixture.badge")}</Badge> : null}
        {synthetic ? t("fixture.artCaption") : t("product.imageMissingDetail")}
      </p>
    </section>
  );
}
