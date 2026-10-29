import type { Route } from "next";
import type { DictionaryKey } from "@/platform/i18n";

export interface NavItem {
  readonly href: Route;
  readonly labelKey: DictionaryKey;
}

/**
 * Primary navigation. Checkout is intentionally absent: it is reached from the cart.
 * `typedRoutes` makes a dead link a compile error; a test also checks each target has a page.
 */
export const NAV_ITEMS = [
  { href: "/search", labelKey: "nav.search" },
  { href: "/cart", labelKey: "nav.cart" },
  { href: "/orders", labelKey: "nav.orders" },
  { href: "/collection", labelKey: "nav.collection" },
  { href: "/about", labelKey: "nav.about" },
] as const satisfies readonly NavItem[];
