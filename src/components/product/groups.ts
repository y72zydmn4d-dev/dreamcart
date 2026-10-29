import { OPTIONAL_ATTRIBUTES, REQUIRED_ATTRIBUTES } from "@/modules/catalog";
import type { ProductView } from "@/modules/discovery";

/**
 * Configurator groups for a product: the category's attributes in their fixed order, keeping only those the
 * catalog actually has values for (a group with no data is never shown).
 */
export function configuratorGroups(product: ProductView): string[] {
  const category = product.product.category;
  return [...REQUIRED_ATTRIBUTES[category], ...OPTIONAL_ATTRIBUTES[category]].filter((key) =>
    product.variants.some((v) => v.variant.attributes[key] !== undefined),
  );
}
