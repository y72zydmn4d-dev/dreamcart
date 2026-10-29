"use client";

import { useCallback, useState } from "react";
import { useLocalData } from "@/components/local-data/local-data";
import { formatMoney } from "@/lib/format";
import type { OfferEvaluation } from "@/modules/pricing";
import type { Money } from "@/modules/shared/domain/money";
import { t } from "@/platform/i18n";
import { cartFailureText } from "./messages";

export interface AddOfferInput {
  readonly variantId: string;
  readonly offerId: string;
  readonly unitPrice: Money;
  readonly evaluation: OfferEvaluation;
  readonly title: string;
  readonly merchant: string;
}

export interface AddOutcome {
  readonly ok: boolean;
  readonly message: string;
}

/** Adds one unit of one offer to the cart and says, in words, what happened. Used by every "add" button. */
export function useAddOffer() {
  const data = useLocalData();
  const { addToCart } = data;
  const [pending, setPending] = useState(false);

  const add = useCallback(
    async (input: AddOfferInput): Promise<AddOutcome> => {
      setPending(true);
      try {
        const result = await addToCart(
          {
            variantId: input.variantId,
            offerId: input.offerId,
            quantity: 1,
            unitPrice: input.unitPrice,
          },
          input.evaluation,
        );
        if (!result.ok) return { ok: false, message: cartFailureText(result) };
        return {
          ok: true,
          message: t("cart.added", {
            title: input.title,
            merchant: input.merchant,
            price: formatMoney(input.unitPrice.amountMinor, input.unitPrice.currency),
          }),
        };
      } finally {
        setPending(false);
      }
    },
    [addToCart],
  );

  return { add, pending, ready: data.status === "ready" };
}
