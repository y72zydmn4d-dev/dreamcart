import type { PlaceActionResult } from "@/components/local-data/local-data";
import { saveReasonText } from "@/components/cart/messages";
import { t, type DictionaryKey } from "@/platform/i18n";

/** The sentence for an order that was not created. Every one of them says that no order exists. */
export function placeFailureText(result: Extract<PlaceActionResult, { ok: false }>): string {
  switch (result.error) {
    case "price_changed":
      return t("checkout.errors.price_changed", { count: result.keys.length });
    case "line_unresolved":
      return t("checkout.errors.line_unresolved", { count: result.keys.length });
    case "line_ineligible":
      return t("checkout.errors.line_ineligible", {
        reason: t(`price.cartBlock.${result.reason}` as DictionaryKey),
      });
    case "storage":
      return t("checkout.errors.storage", { reason: saveReasonText(result.kind) });
    case "stale_cart":
    case "cart_not_checkoutable":
    case "not_acknowledged":
    case "invalid_scenario":
      return t(`checkout.errors.${result.error}` as DictionaryKey);
  }
}
