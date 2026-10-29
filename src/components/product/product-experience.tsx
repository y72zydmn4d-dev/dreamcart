"use client";

import { useMemo, useState } from "react";
import { useCatalog } from "@/components/catalog/catalog-context";
import { Badge } from "@/components/ui/badge";
import type { Vocabulary } from "@/modules/catalog";
import type { ProductView } from "@/modules/discovery";
import { deriveConfigurator, groupValues, type Selection } from "@/modules/configurator";
import { t } from "@/platform/i18n";
import { formatAttribute } from "./attribute-format";
import { Configurator } from "./configurator";
import { Gallery } from "./gallery";
import { configuratorGroups } from "./groups";
import { VariantOffers } from "./variant-offers";

/** A group with exactly one real value is pre-selected: that is not a substitution, it is the only choice. */
function initialSelectionFor(
  variants: { id: string; attributes: Record<string, string | number | undefined> }[],
  groups: readonly string[],
): Selection {
  return Object.fromEntries(
    groups.flatMap((key) => {
      const values = groupValues(variants, key);
      return values.length === 1 ? [[key, values[0]!]] : [];
    }),
  );
}

export function ProductExperience({ productId }: { readonly productId: string }) {
  const { view, synthetic } = useCatalog();
  const product = view.byId.get(productId);
  if (!product) throw new Error(`Unknown product ${productId}`); // the page 404s before this can happen
  return (
    <ProductExperienceInner
      key={productId}
      product={product}
      synthetic={synthetic}
      vocabulary={view.catalog.vocabulary}
    />
  );
}

function ProductExperienceInner({
  product,
  synthetic,
  vocabulary,
}: {
  readonly product: ProductView;
  readonly synthetic: boolean;
  readonly vocabulary: Vocabulary;
}) {
  const groups = useMemo(() => configuratorGroups(product), [product]);
  const configVariants = useMemo(
    () => product.variants.map((v) => ({ id: v.variant.id, attributes: v.variant.attributes })),
    [product],
  );
  const initialSelection = useMemo(
    () => initialSelectionFor(configVariants, groups),
    [configVariants, groups],
  );
  const [selection, setSelection] = useState<Selection>(initialSelection);

  // The placeholder tint follows the chosen color, or the first variant still compatible.
  const derived = deriveConfigurator(configVariants, groups, selection);
  const colorValue =
    selection.color ??
    product.variants.find((v) => derived.matchingVariantIds.includes(v.variant.id))?.variant
      .attributes.color;
  const swatch =
    typeof colorValue === "string" ? vocabulary.color?.[colorValue]?.swatch : undefined;
  const resolved = derived.resolvedVariantId
    ? (product.variants.find((v) => v.variant.id === derived.resolvedVariantId) ?? null)
    : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
      <div className="lg:sticky lg:top-32 lg:self-start">
        <Gallery
          product={product}
          synthetic={synthetic}
          color={swatch}
          colorLabel={
            colorValue !== undefined ? formatAttribute("color", colorValue, vocabulary) : undefined
          }
        />
      </div>
      <div className="flex min-w-0 flex-col gap-8">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t(`categories.${product.product.category}.name`)}
            </span>
            {synthetic ? <Badge tone="fixture">{t("fixture.badge")}</Badge> : null}
          </div>
          <h1 className="text-display font-semibold">{product.product.titleVi}</h1>
          <p className="text-title text-muted-foreground">
            {[product.product.brand, product.product.family, product.product.model]
              .filter(Boolean)
              .join(" ")}
          </p>
          <p className="max-w-prose text-muted-foreground">{product.product.summaryVi}</p>
        </header>
        <Configurator
          product={product}
          groups={groups}
          vocabulary={vocabulary}
          synthetic={synthetic}
          selection={selection}
          initialSelection={initialSelection}
          onChange={setSelection}
        />
        <VariantOffers variant={resolved} synthetic={synthetic} title={product.product.titleVi} />
      </div>
    </div>
  );
}
