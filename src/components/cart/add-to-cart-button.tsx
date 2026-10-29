"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/platform/i18n";
import { useAddOffer, type AddOfferInput, type AddOutcome } from "./use-add-offer";

/** One "add" button per offer. The result is announced in a polite live region and never silently clamps. */
export function AddToCartButton(input: AddOfferInput) {
  const { add, pending, ready } = useAddOffer();
  const [outcome, setOutcome] = useState<AddOutcome | null>(null);

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button
        size="sm"
        disabled={!ready}
        aria-busy={pending}
        onClick={async () => {
          if (!pending) setOutcome(await add(input));
        }}
      >
        {pending ? t("cart.adding") : t("cart.add")}
      </Button>
      <p
        role="status"
        className={cn("max-w-prose text-sm", outcome ? "" : "sr-only")}
        data-testid="add-to-cart-status"
      >
        {outcome?.message}
        {outcome?.ok ? (
          <>
            {" "}
            <Link href="/cart" className="font-medium underline underline-offset-2">
              {t("cart.viewCart")}
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
