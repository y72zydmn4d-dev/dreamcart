"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  deriveConfigurator,
  groupValues,
  type Selection,
} from "@/modules/configurator/domain/configurator";
import { t } from "@/platform/i18n";
import { COLOR_SWATCHES, type PrototypeProduct } from "@/prototype/catalog";
import { formatAttribute } from "./attribute-format";
import { Configurator } from "./configurator";
import { Gallery } from "./gallery";

/** A group with exactly one real value is pre-selected: that is not a substitution, it is the only choice. */
function initialSelectionFor(product: PrototypeProduct): Selection {
  return Object.fromEntries(
    product.groups.flatMap((key) => {
      const values = groupValues(product.variants, key);
      return values.length === 1 ? [[key, values[0]!]] : [];
    }),
  );
}

export function ProductExperience({ product }: { readonly product: PrototypeProduct }) {
  const initialSelection = useMemo(() => initialSelectionFor(product), [product]);
  const [selection, setSelection] = useState<Selection>(initialSelection);

  // The gallery tint follows the chosen color, or the first variant still compatible.
  const matching = deriveConfigurator(
    product.variants,
    product.groups,
    selection,
  ).matchingVariantIds;
  const color =
    selection.color ?? product.variants.find((v) => matching.includes(v.id))?.attributes.color;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
      <div className="lg:sticky lg:top-32 lg:self-start">
        <Gallery
          kind={product.art}
          name={product.name}
          color={color ? COLOR_SWATCHES[String(color)] : undefined}
          colorLabel={color ? formatAttribute("color", color) : undefined}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-8">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t(`categories.${product.category}.name`)}
            </span>
            <Badge tone="fixture">{t("fixture.badge")}</Badge>
          </div>
          <h1 className="text-display font-semibold">{product.name}</h1>
          <p className="text-title text-muted-foreground">{product.tagline}</p>
          <p className="max-w-prose text-muted-foreground">{product.summary}</p>
        </header>
        <Configurator
          product={product}
          selection={selection}
          initialSelection={initialSelection}
          onChange={setSelection}
        />
      </div>
    </div>
  );
}
