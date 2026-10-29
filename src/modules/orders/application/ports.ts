import type { PlaceOrderError, PlaceOrderInput, VirtualOrder } from "../domain/order";
import type { OrderState, ProgressState, TransitionError } from "../domain/simulation";

/**
 * Persistence ports (docs/ARCHITECTURE.md §3). Adapters live in `platform/persistence`; the domain and the
 * use cases depend only on these interfaces. Expected refusals are returned as results; infrastructure
 * failures (quota, aborted transaction, unavailable storage) are thrown as `StorageError`.
 */

/** Everything `placeOrder` needs except the cart, which the repository reads inside its transaction. */
export type PlaceOrderCommand = Omit<PlaceOrderInput, "cart"> & {
  /** Fresh idempotency key for the (now empty) cart; the domain has no randomness. */
  readonly nextCheckoutKey: string;
};

export type PlaceOrderOutcome =
  | { readonly ok: true; readonly status: "created" | "existing"; readonly order: VirtualOrder }
  | ({ readonly ok: false } & PlaceOrderError)
  /** The generated display code already exists on another order: retry with a new code. */
  | { readonly ok: false; readonly error: "code_collision" };

export interface ObservedOrder {
  readonly order: VirtualOrder;
  readonly state: OrderState;
}

export type OrderMutationResult =
  | ({ readonly ok: true } & ObservedOrder)
  | { readonly ok: false; readonly error: "not_found" }
  | { readonly ok: false; readonly error: TransitionError; readonly state: OrderState };

export interface OrderRepository {
  /**
   * Atomic and idempotent. One read-write transaction over `cart` and `orders`: return the existing order for
   * the idempotency key if there is one; otherwise decide with the domain `placeOrder`, insert the order,
   * clear the cart and rotate its checkout key. Any failure rolls everything back.
   */
  placeOrder(command: PlaceOrderCommand): Promise<PlaceOrderOutcome>;
  get(id: string): Promise<VirtualOrder | null>;
  /** Newest first. Records that fail validation are quarantined and left out. */
  list(): Promise<VirtualOrder[]>;
  /** Evaluate the state with the injected clock and raise the stored high-water mark (max only). */
  observe(id: string): Promise<ObservedOrder | null>;
  observeAll(): Promise<ObservedOrder[]>;
  /** Fast scenario only. Evaluates with the injected clock and writes in one transaction. */
  advance(id: string): Promise<OrderMutationResult>;
  /** The state check runs inside the same transaction that records the cancellation. */
  cancel(id: string): Promise<OrderMutationResult>;
  /** Raises the high-water mark with `max()` only; never lowers it. */
  recordHighWater(id: string, state: ProgressState): Promise<void>;
  /** True if an order was deleted. */
  delete(id: string): Promise<boolean>;
  deleteAll(): Promise<void>;
}
