import { sha256Hex } from "@/modules/shared/domain/sha256";

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

const fold = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * A stable product id from the product's identity (manufacturer, family, model): the same identity always gives the
 * same id, case, accents and punctuation do not change it, and it is a valid route segment (lowercase letters,
 * digits and hyphens, at most 64 characters). Long identities are shortened with a hash of the full identity so two
 * different products never collide. Never starts with `fx-` (reserved for synthetic fixtures).
 */
export function deriveProductId(identity: {
  readonly brand: string;
  readonly family: string;
  readonly model: string;
}): string {
  const parts = [identity.brand, identity.family, identity.model].map(fold).filter(Boolean);
  const full = parts.join("-");
  const id =
    full.length <= 64
      ? full
      : `${full.slice(0, 55).replace(/-+$/, "")}-${sha256Hex(full).slice(0, 8)}`;
  return id.startsWith("fx-") ? `p-${id}`.slice(0, 64) : id;
}
