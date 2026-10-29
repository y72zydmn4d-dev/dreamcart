declare const productIdBrand: unique symbol;

/** A product identifier that has passed `parseProductId`. */
export type ProductId = string & { readonly [productIdBrand]: true };

const PRODUCT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * Validate a product id taken from a URL segment: lowercase slug, 1–64 characters.
 * Anything else (path tricks, whitespace, uppercase, non-ASCII) is rejected, so a route never
 * renders or looks up an arbitrary string.
 */
export function parseProductId(raw: string): ProductId | null {
  return PRODUCT_ID_PATTERN.test(raw) ? (raw as ProductId) : null;
}
