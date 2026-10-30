import type { CatalogData } from "@/modules/catalog";
import featured from "../../../data/catalog-staging/apple-vn/featured.json";
import media from "../../../data/catalog-staging/apple-vn/media.json";
import offers from "../../../data/catalog-staging/apple-vn/offers.json";
import products from "../../../data/catalog-staging/apple-vn/products.json";
import sources from "../../../data/catalog-staging/apple-vn/sources.json";
import variants from "../../../data/catalog-staging/apple-vn/variants.json";
import vocabulary from "../../../data/catalog-staging/apple-vn/vocabulary.json";

/**
 * The STAGED real catalog (Apple Store Vietnam program): records being verified, imported in batches. It is
 * validated like the real catalog but only served when `REAL_CATALOG_STAGING` is active outside production
 * (see `resolveActivation`). Loaded lazily so it stays out of every other path.
 */
export const STAGING_RAW = {
  sources,
  products,
  variants,
  offers,
  media,
  vocabulary,
  featured,
} as unknown as CatalogData;
