import type { Cart } from "../domain/cart";

export type CartSaveResult =
  | { readonly ok: true; readonly cart: Cart }
  /** Another tab (or an earlier request) already advanced the cart. `current` is what is stored now. */
  | { readonly ok: false; readonly error: "stale_revision"; readonly current: Cart };

export interface CartRepository {
  /** The stored cart, or a fresh empty one (revision 0, new checkout key) when nothing valid is stored. */
  get(): Promise<Cart>;
  /**
   * Optimistic concurrency: the stored revision must be exactly `cart.revision - 1` (an absent cart counts as
   * revision 0). A save based on an outdated read is rejected, never merged and never overwritten.
   */
  save(cart: Cart): Promise<CartSaveResult>;
}
