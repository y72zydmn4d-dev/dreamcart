import type { Cart } from "@/modules/cart";
import type { PlaceOrderError, PlaceOrderInput, VirtualOrder } from "../domain/order";
import type { OrderState } from "../domain/simulation";

/**
 * Persistence ports (docs/ARCHITECTURE.md §3). Phase 4 provides the IndexedDB adapters; the domain and use
 * cases depend only on these interfaces. Tests are written against the port so a later adapter can reuse them.
 */

export interface CartRepository {
  /** Includes `revision` and `checkoutKey`. An empty cart is returned when nothing is stored. */
  get(): Promise<Cart>;
  /** Revision-checked: a save whose `revision` is not newer than the stored one is rejected. */
  save(cart: Cart): Promise<void>;
}

/** Everything `placeOrder` needs except the data the repository itself reads inside the transaction. */
export type PlaceOrderCommand = Omit<PlaceOrderInput, "cart">;

export type PlaceOrderOutcome =
  | { readonly ok: true; readonly status: "created" | "existing"; readonly order: VirtualOrder }
  | ({ readonly ok: false } & PlaceOrderError);

export interface OrderRepository {
  /**
   * Atomic and idempotent. One read-write transaction over `cart` and `orders`: return the existing order for
   * the idempotency key if there is one; otherwise decide with the domain `placeOrder`, insert the order,
   * clear the cart and rotate its checkout key.
   */
  placeOrder(command: PlaceOrderCommand): Promise<PlaceOrderOutcome>;
  get(id: string): Promise<VirtualOrder | null>;
  list(): Promise<VirtualOrder[]>;
  /** Fast scenario only. Evaluates with the injected clock and writes in one transaction. */
  advance(id: string): Promise<VirtualOrder>;
  /** The state check runs inside the same transaction that records the cancellation. */
  cancel(id: string): Promise<VirtualOrder>;
  /** Raises the high-water mark with `max()` only; never lowers it. */
  recordHighWater(id: string, state: Exclude<OrderState, "CANCELLED">): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}

/** Versioned export/import. The bundle shape and validation are specified in ARCHITECTURE §5 (Phase 4). */
export interface ExportBundle {
  readonly format: "dreamcart-export";
  readonly version: number;
  readonly simulation: true;
  readonly notice: string;
  readonly exportedAt: string;
  readonly appVersion: string;
  readonly data: {
    readonly cart: Cart;
    readonly orders: readonly VirtualOrder[];
    readonly userProducts: readonly unknown[];
    readonly settings: Readonly<Record<string, unknown>>;
  };
}

export interface ImportReport {
  readonly added: number;
  readonly skippedExisting: number;
  readonly quarantined: number;
}

export interface PortabilityRepository {
  exportAll(): Promise<ExportBundle>;
  /** `bundle` must already have passed the Zod validation and URL re-validation. */
  importBundle(bundle: ExportBundle, mode: "merge" | "replace"): Promise<ImportReport>;
}
