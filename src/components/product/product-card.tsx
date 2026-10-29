import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatVnd } from "@/lib/format";
import type { MatchClass } from "@/modules/search";
import type { ProductView, ReferencePrice, VariantView } from "@/modules/discovery";
import { t, type DictionaryKey } from "@/platform/i18n";
import { attributeLabel } from "./attribute-format";
import { PriceNote } from "./price-note";
import { ProductImage } from "./product-image";

interface ProductCardProps {
  readonly product: ProductView;
  /** Variants that satisfy the current query and filters; the "from" price and the count come from them. */
  readonly variants?: readonly VariantView[];
  readonly startingPrice?: ReferencePrice | null;
  readonly matchClass?: MatchClass | "browse";
  readonly reasons?: readonly string[];
  readonly synthetic: boolean;
  /** Placeholder tint (vocabulary swatch of the first matching color), if any. */
  readonly color?: string;
  readonly headingLevel?: "h2" | "h3";
}

function reasonText(reason: string): string {
  const [code, attr] = reason.split(":");
  const key =
    `search.reasons.${code === "conflicting" || code === "constraint_unavailable" || code === "constraint_unknown" ? code : reason}` as DictionaryKey;
  return t(key, { attr: attr ? attributeLabel(attr) : "" });
}

/** One link per card; the product name is the accessible name. Prices always carry their provenance. */
export function ProductCard({
  product,
  variants = product.variants,
  startingPrice = product.startingPrice,
  matchClass = "browse",
  reasons = [],
  synthetic,
  color,
  headingLevel = "h3",
}: ProductCardProps) {
  const Heading = headingLevel;
  const unpriced = variants.filter((v) => v.status === "unpriced").length;
  const title = product.product.titleVi;

  return (
    <Link
      href={`/product/${product.product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card transition-[box-shadow,transform] duration-(--duration-base) ease-standard hover:-translate-y-0.5 hover:shadow-float"
    >
      <div className="bg-art-stage">
        <ProductImage
          product={product}
          color={color}
          label={t("art.labelNoColor", { name: title })}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t(`categories.${product.product.category}.short`)}
          </span>
          {synthetic ? <Badge tone="fixture">{t("fixture.badge")}</Badge> : null}
          {matchClass === "near" ? <Badge tone="warning">{t("search.matchNear")}</Badge> : null}
          {matchClass === "ambiguous" ? (
            <Badge tone="warning">{t("search.matchAmbiguous")}</Badge>
          ) : null}
        </div>
        <Heading className="mt-1 text-lg font-semibold tracking-tight group-hover:text-accent">
          {title}
        </Heading>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.product.summaryVi}</p>
        {reasons.length > 0 ? (
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
            {reasons.map((r) => (
              <li key={r}>{reasonText(r)}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto flex flex-col gap-0.5 pt-3">
          {startingPrice ? (
            <>
              <p className="font-semibold">
                {t("search.fromPrice", { price: formatVnd(startingPrice.amountMinor) })}
              </p>
              <PriceNote
                observedAt={startingPrice.observedAt}
                state={startingPrice.state}
                synthetic={synthetic}
              />
            </>
          ) : (
            <p className="font-semibold text-muted-foreground">{t("search.noPrice")}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t("search.variants", { count: variants.length })}
            {unpriced > 0 ? ` · ${t("search.unpricedCount", { count: unpriced })}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}
