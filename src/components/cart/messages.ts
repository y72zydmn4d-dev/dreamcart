import { MAX_QUANTITY } from "@/modules/cart";
import type { CartActionResult } from "@/components/local-data/local-data";
import { t, type DictionaryKey } from "@/platform/i18n";
import type { StorageErrorKind } from "@/platform/persistence";

export function saveReasonText(kind: StorageErrorKind): string {
  switch (kind) {
    case "quota_exceeded":
      return t("cart.saveReasons.quota_exceeded");
    case "aborted":
      return t("cart.saveReasons.aborted");
    case "unavailable":
      return t("cart.saveReasons.unavailable");
    default:
      return t("cart.saveReasons.other");
  }
}

/** The sentence for a cart change that did not happen. Always says the cart was left as it was. */
export function cartFailureText(result: Extract<CartActionResult, { ok: false }>): string {
  switch (result.error) {
    case "quantity_limit":
      return t("cart.errors.quantity_limit", { max: MAX_QUANTITY });
    case "invalid_quantity":
      return t("cart.errors.invalid_quantity");
    case "line_not_found":
      return t("cart.errors.line_not_found");
    case "not_addable":
      return t("cart.errors.not_addable", {
        reason: t(`price.cartBlock.${result.reason ?? "no_price"}` as DictionaryKey),
      });
    case "stale_revision":
      return t("cart.errors.stale_revision");
    case "storage":
      return t("cart.errors.storage", { reason: saveReasonText(result.kind) });
  }
}
