import type { CartRepository } from "@/modules/cart";
import type { PortabilityRepository } from "@/modules/data-portability";
import type { OrderRepository } from "@/modules/orders";
import type { SettingsRepository } from "@/modules/settings";
import type { UserProduct } from "@/modules/catalog";
import type { Clock, IdGenerator } from "@/modules/shared/domain/ports";
import type { StorageErrorKind } from "./errors";

export type QuarantinedStore = "cart" | "orders" | "settings" | "userProducts";

/** A record that failed validation, set aside instead of deleted so nothing is silently lost. */
export interface QuarantineEntry {
  readonly id: number;
  readonly store: QuarantinedStore;
  readonly key: string;
  readonly reason: string;
  readonly quarantinedAtMs: number;
  readonly payload: unknown;
}

export type ChangeEvent = {
  readonly store: "cart" | "orders" | "settings" | "userProducts" | "all";
};

export interface UserProductRepository {
  list(): Promise<UserProduct[]>;
  put(product: UserProduct): Promise<void>;
  delete(id: string): Promise<boolean>;
}

/** Everything the application needs from local storage. IndexedDB and memory adapters both implement it. */
export interface Persistence {
  readonly kind: "indexeddb" | "memory";
  readonly cart: CartRepository;
  readonly orders: OrderRepository;
  readonly userProducts: UserProductRepository;
  readonly settings: SettingsRepository;
  readonly portability: PortabilityRepository;
  quarantine: {
    list(): Promise<QuarantineEntry[]>;
    clear(): Promise<void>;
  };
  /**
   * The supported, explicit "delete my data": clears the cart, orders, imported products, settings and the
   * quarantine in one transaction. Never called implicitly.
   */
  deleteAllData(): Promise<void>;
  close(): void;
}

export interface PersistenceDeps {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  /** Called after a successful commit so other tabs can refresh (see `broadcast-channel.ts`). */
  readonly notify?: (event: ChangeEvent) => void;
  readonly appVersion?: string;
}

export interface FallbackResult {
  readonly persistence: Persistence;
  /** Set when IndexedDB could not be used and data lives in memory only (lost when the page closes). */
  readonly degraded: StorageErrorKind | null;
}
