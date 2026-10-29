"use client";

import { useLocalData } from "@/components/local-data/local-data";
import { t } from "@/platform/i18n";

/** Total units in the cart, next to the cart link. Renders nothing while loading or when the cart is empty. */
export function CartCount() {
  const { cart } = useLocalData();
  const count = cart ? cart.lines.reduce((sum, l) => sum + l.quantity, 0) : 0;
  if (count === 0) return null;
  return (
    <>
      <span
        aria-hidden="true"
        className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium text-accent-foreground"
      >
        {count}
      </span>
      <span className="sr-only">{t("cart.countLabel", { count })}</span>
    </>
  );
}
