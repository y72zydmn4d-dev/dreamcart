import type { Vocabulary, ValidatedCatalog } from "@/modules/catalog";
import { BASE_VOCABULARY, type SearchProduct, type SearchVocabulary } from "@/modules/search";
import type { CatalogView } from "./catalog-view";

/** Vietnamese display label for a coded attribute value (chip, color, type…), or the raw value if none exists. */
export function valueLabelVi(vocabulary: Vocabulary, key: string, value: string | number): string {
  return vocabulary[key]?.[String(value)]?.labelVi ?? String(value);
}

/**
 * Search vocabulary built from the catalog itself: a color or chip can only be recognized in a query if the
 * catalog has it. Built-in color words (black, den…) are kept only when the catalog uses that canonical value.
 */
export function buildSearchVocabulary(catalog: ValidatedCatalog): SearchVocabulary {
  const used = (key: string) =>
    new Set(
      catalog.variants.flatMap((v) =>
        typeof v.attributes[key] === "string" ? [v.attributes[key] as string] : [],
      ),
    );
  const colorsUsed = used("color");
  const chipsUsed = used("chip");
  const colors: Record<string, string> = {};
  for (const [word, canonical] of Object.entries(BASE_VOCABULARY.colors))
    if (colorsUsed.has(canonical)) colors[word] = canonical;
  const chipTokens = new Set<string>();
  for (const [key, entries] of Object.entries(catalog.vocabulary)) {
    for (const [value, entry] of Object.entries(entries)) {
      if (key === "color" && colorsUsed.has(value)) {
        for (const alias of entry.aliases) colors[alias] = value;
        if (/^[a-z0-9]+$/.test(value)) colors[value] = value;
      }
      if (key === "chip" && chipsUsed.has(value)) {
        for (const alias of entry.aliases) chipTokens.add(alias);
        if (/^[a-z0-9]+$/.test(value)) chipTokens.add(value);
      }
    }
  }
  return { ...BASE_VOCABULARY, colors, isChip: (token) => chipTokens.has(token) };
}

/** The search module's view of the catalog: identity and variant attributes only, no prices. */
export function toSearchProducts(view: CatalogView): SearchProduct[] {
  return view.products.map((p) => ({
    id: p.product.id,
    brand: p.product.brand,
    family: p.product.family,
    model: p.product.model,
    category: p.product.category,
    variants: p.variants.map((v) => ({ id: v.variant.id, attributes: v.variant.attributes })),
    ...(p.product.compatibleWith ? { compatibleWith: p.product.compatibleWith } : {}),
  }));
}
