import type { Money } from "@/modules/shared/domain/money";
import type { IneligibleReason, OfferEvaluation } from "@/modules/pricing";
import type { CartLine } from "./cart";

/** What the catalog says about a cart line's offer right now. `null` means the offer is no longer known. */
export interface CurrentOffer {
  readonly price: Money | null;
  readonly evaluation: OfferEvaluation;
}

export type LineStatus =
  | { readonly kind: "ok" }
  /** The price differs from the one the user saw. Checkout refuses until the user accepts the new price. */
  | { readonly kind: "price_changed"; readonly current: Money }
  /** The variant or offer is not in the catalog (or the imported item was deleted). */
  | { readonly kind: "unavailable" }
  | { readonly kind: "ineligible"; readonly reason: IneligibleReason };

/**
 * Compare a cart line with the offer as the catalog describes it now. Mirrors the checks `placeOrder` makes, so
 * the cart can say what checkout would refuse before the user gets there. Ineligibility wins over a price change.
 */
export function assessLine(line: CartLine, current: CurrentOffer | null): LineStatus {
  if (current === null) return { kind: "unavailable" };
  if (!current.evaluation.addable || current.price === null) {
    return { kind: "ineligible", reason: current.evaluation.reason ?? "no_price" };
  }
  if (
    current.price.amountMinor !== line.unitPrice.amountMinor ||
    current.price.currency !== line.unitPrice.currency
  ) {
    return { kind: "price_changed", current: current.price };
  }
  return { kind: "ok" };
}
