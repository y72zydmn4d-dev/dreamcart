import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatVnd } from "@/lib/format";
import { t } from "@/platform/i18n";
import { COLOR_SWATCHES, type PrototypeProduct, type PrototypeVariant } from "@/prototype/catalog";
import { ProductArt } from "./product-art";

interface ProductCardProps {
  readonly product: PrototypeProduct;
  /** Variants that satisfy the current filters; the price shown is the lowest among them. */
  readonly variants?: readonly PrototypeVariant[];
  readonly headingLevel?: "h2" | "h3";
}

/** One link per card; the product name is the accessible name. */
export function ProductCard({
  product,
  variants = product.variants,
  headingLevel = "h3",
}: ProductCardProps) {
  const Heading = headingLevel;
  const fromPrice = Math.min(...variants.map((v) => v.samplePriceMinor));
  const firstColor = variants.find((v) => v.attributes.color)?.attributes.color;
  const color = firstColor ? COLOR_SWATCHES[String(firstColor)] : undefined;

  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card transition-[box-shadow,transform] duration-(--duration-base) ease-standard hover:-translate-y-0.5 hover:shadow-float"
    >
      <div className="bg-art-stage">
        <ProductArt
          kind={product.art}
          color={color}
          label={t("art.labelNoColor", { name: product.name })}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t(`categories.${product.category}.short`)}
          </span>
          <Badge tone="fixture">{t("fixture.badge")}</Badge>
        </div>
        <Heading className="mt-1 text-lg font-semibold tracking-tight group-hover:text-accent">
          {product.name}
        </Heading>
        <p className="text-sm text-muted-foreground">{product.tagline}</p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-3">
          <p className="font-semibold">{t("search.fromPrice", { price: formatVnd(fromPrice) })}</p>
          <p className="text-xs text-muted-foreground">
            {t("fixture.priceLabel")} · {t("search.variants", { count: variants.length })}
          </p>
        </div>
      </div>
    </Link>
  );
}
