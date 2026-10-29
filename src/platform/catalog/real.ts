import type { CatalogData } from "@/modules/catalog";
import featured from "../../../data/catalog/featured.json";
import media from "../../../data/catalog/media.json";
import offers from "../../../data/catalog/offers.json";
import products from "../../../data/catalog/products.json";
import sources from "../../../data/catalog/sources.json";
import variants from "../../../data/catalog/variants.json";
import vocabulary from "../../../data/catalog/vocabulary.json";

/** The curated, verified catalog (`data/catalog/`). Empty until the owner supplies verified records. */
export const REAL_RAW = {
  sources,
  products,
  variants,
  offers,
  media,
  vocabulary,
  featured,
} as unknown as CatalogData;
