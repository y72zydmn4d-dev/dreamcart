import type { CatalogData } from "@/modules/catalog";
import featured from "../../../data/synthetic/featured.json";
import media from "../../../data/synthetic/media.json";
import offers from "../../../data/synthetic/offers.json";
import products from "../../../data/synthetic/products.json";
import sources from "../../../data/synthetic/sources.json";
import variants from "../../../data/synthetic/variants.json";
import vocabulary from "../../../data/synthetic/vocabulary.json";

/**
 * SYNTHETIC FIXTURE CATALOG ("Fixturia", ids start with `fx-`). Fictional brand, products, shops and prices used
 * to build and test the shopping journey. It is isolated here, validated in `synthetic` mode, and excluded from
 * release builds (`NEXT_PUBLIC_DREAMCART_RELEASE=1`). It must never be shown as real commerce data.
 */
export const SYNTHETIC_RAW = {
  sources,
  products,
  variants,
  offers,
  media,
  vocabulary,
  featured,
} as unknown as CatalogData;
