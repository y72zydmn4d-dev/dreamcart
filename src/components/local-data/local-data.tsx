"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addLine,
  acceptPrices,
  removeLine,
  setQuantity,
  type Cart,
  type CartError,
  type CartLine,
  type CartResult,
} from "@/modules/cart";
import {
  createUserProduct,
  MAX_USER_PRODUCTS,
  type UserProduct,
  type UserProductDraft,
  type UserProductProblem,
} from "@/modules/catalog";
import {
  parseBackup,
  serializeBackup,
  type BackupBundle,
  type ImportMode,
  type ImportReport,
  type ParseBackupResult,
} from "@/modules/data-portability";
import {
  formatOrderCode,
  type DestinationPreset,
  type OrderMutationResult,
  type PaymentLabel,
  type PlaceOrderError,
  type ResolvedLine,
  type ScenarioKey,
  type ObservedOrder,
  type VirtualOrder,
} from "@/modules/orders";
import type { IneligibleReason, OfferEvaluation } from "@/modules/pricing";
import { DEFAULT_SETTINGS, type Settings } from "@/modules/settings";
import type { Money } from "@/modules/shared/domain/money";
import {
  browserIds,
  classifyStorageError,
  dataMarker,
  createBroadcastNotifier,
  openPersistence,
  systemClock,
  type Persistence,
  type QuarantineEntry,
  type StorageErrorKind,
} from "@/platform/persistence";

export type LocalDataStatus = "loading" | "ready" | "failed";
export type StorageFailure = "schema_too_new" | "migration_failed" | "blocked" | "unknown";

/** A cart change that did not happen, and why. A rejected change always leaves the stored cart as it was. */
export type CartActionError =
  | { readonly error: CartError; readonly reason?: IneligibleReason }
  /** Another tab changed the cart at the same moment; the screen now shows what is stored. */
  | { readonly error: "stale_revision" }
  | { readonly error: "storage"; readonly kind: StorageErrorKind };

export type CartActionResult =
  { readonly ok: true; readonly cart: Cart } | ({ readonly ok: false } & CartActionError);

export type ImportActionResult =
  | { readonly ok: true; readonly product: UserProduct; readonly removedParams: readonly string[] }
  | ({ readonly ok: false } & (
      | { readonly error: "invalid"; readonly issues: readonly UserProductProblem[] }
      | { readonly error: "limit" }
      | { readonly error: "storage"; readonly kind: StorageErrorKind }
    ));

export interface PlaceOrderArgs {
  /** The checkout key of the cart the user is looking at. A different stored key means the cart changed under them. */
  readonly idempotencyKey: string;
  readonly resolveLine: (variantId: string, offerId: string) => ResolvedLine | null;
  readonly catalogVersion: string;
  readonly scenario: ScenarioKey;
  readonly destination: DestinationPreset;
  readonly payment: PaymentLabel;
  readonly acknowledged: boolean;
}

export type PlaceActionResult =
  | { readonly ok: true; readonly status: "created" | "existing"; readonly order: VirtualOrder }
  | ({ readonly ok: false } & PlaceOrderError)
  | { readonly ok: false; readonly error: "storage"; readonly kind: StorageErrorKind };

export type OrderActionResult =
  | OrderMutationResult
  | { readonly ok: false; readonly error: "storage"; readonly kind: StorageErrorKind };

export type ExportActionResult =
  | { readonly ok: true; readonly text: string; readonly filename: string; readonly orders: number }
  | { readonly ok: false; readonly kind: StorageErrorKind };

export type RestoreActionResult =
  | { readonly ok: true; readonly report: ImportReport }
  | { readonly ok: false; readonly kind: StorageErrorKind };

export interface LocalData {
  readonly status: LocalDataStatus;
  /** Why storage could not be opened at all (newer database, failed upgrade, blocked upgrade). */
  readonly failure: StorageFailure | null;
  /** Set when data only lives in memory and will be lost when the page closes. */
  readonly degraded: StorageErrorKind | null;
  readonly cart: Cart | null;
  readonly userProducts: readonly UserProduct[];
  readonly quarantined: readonly QuarantineEntry[];
  /** Orders with the state they are in right now (re-read when this or another tab changes anything). */
  readonly orders: readonly ObservedOrder[];
  readonly settings: Settings;
  /** This browser once held orders or imported items and now holds none: probably cleared or evicted data. */
  readonly lostData: boolean;
  /** True after another tab changed the cart; cleared by the next action in this tab. */
  readonly changedElsewhere: boolean;
  readonly dismissChangedElsewhere: () => void;
  readonly addToCart: (line: CartLine, eligibility: OfferEvaluation) => Promise<CartActionResult>;
  readonly changeQuantity: (key: string, quantity: number) => Promise<CartActionResult>;
  readonly removeFromCart: (key: string) => Promise<CartActionResult>;
  /** The user accepts today's price for these lines (keyed by `lineKey`). */
  readonly acceptCurrentPrices: (prices: ReadonlyMap<string, Money>) => Promise<CartActionResult>;
  readonly importProduct: (draft: UserProductDraft) => Promise<ImportActionResult>;
  readonly deleteUserProduct: (id: string) => Promise<boolean>;
  readonly placeOrder: (args: PlaceOrderArgs) => Promise<PlaceActionResult>;
  readonly cancelOrder: (id: string) => Promise<OrderActionResult>;
  readonly deleteOrder: (id: string) => Promise<boolean>;
  /** Fast scenario only: one step forward from the state currently shown. */
  readonly advanceOrder: (id: string) => Promise<OrderActionResult>;
  /** Persist what has been shown (raises each order's high-water mark) and re-read the orders. */
  readonly recordProgress: () => Promise<void>;
  /** Remember that a one-time notice was seen. */
  readonly dismissNotice: (id: string) => Promise<void>;
  readonly updateSettings: (patch: Partial<Settings>) => Promise<boolean>;
  readonly exportBackup: () => Promise<ExportActionResult>;
  /** Parse a backup file's text. Pure: nothing is stored until `restoreBackup`. */
  readonly parseBackupText: (text: string) => ParseBackupResult;
  readonly restoreBackup: (bundle: BackupBundle, mode: ImportMode) => Promise<RestoreActionResult>;
  /** Deletes every DreamCart record on this device. Callers must have asked the user first. */
  readonly resetAll: () => Promise<boolean>;
}

const LocalDataContext = createContext<LocalData | null>(null);

const SAVE_ATTEMPTS = 3;
const FATAL = ["schema_too_new", "migration_failed", "blocked"] as const;
const failureOf = (kind: StorageErrorKind): StorageFailure =>
  (FATAL as readonly StorageErrorKind[]).includes(kind) ? (kind as StorageFailure) : "unknown";

let opening: ReturnType<typeof openPersistence> | null = null;
/** One connection per page, even if the provider mounts twice (React Strict Mode). Browser only, never at import. */
function openOnce() {
  if (!opening) {
    const notifier = createBroadcastNotifier();
    opening = openPersistence({
      clock: systemClock,
      ids: browserIds,
      notify: (event) => notifier.notify(event),
    });
  }
  return opening;
}

const CODE_ATTEMPTS = 3;
/** After a restore or reset the cart revision jumps; do not report our own big change as another tab's. */
const QUIET_AFTER_BULK_MS = 3000;

const markerStorage = () => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

/** The user deleted the last order or imported item on purpose: an empty browser is then expected, not suspicious. */
async function clearMarkerIfEmpty(p: Persistence) {
  const [orders, products] = await Promise.all([p.orders.list(), p.userProducts.list()]);
  if (orders.length === 0 && products.length === 0) dataMarker(markerStorage()).clear();
}

const storageKindOf = (e: unknown): StorageErrorKind => classifyStorageError(e).kind;

/**
 * Owns the browser's local data for the whole app: opens IndexedDB once (falling back to memory with a visible
 * notice), keeps the cart and imported items in state, and refreshes them when another tab changes anything.
 * Every cart change re-reads the stored cart immediately before applying it and is saved with the optimistic
 * revision check, so two tabs can never overwrite each other.
 */
export function LocalDataProvider({ children }: { readonly children: ReactNode }) {
  const [status, setStatus] = useState<LocalDataStatus>("loading");
  const [failure, setFailure] = useState<StorageFailure | null>(null);
  const [degraded, setDegraded] = useState<StorageErrorKind | null>(null);
  const [persistence, setPersistence] = useState<Persistence | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [userProducts, setUserProducts] = useState<readonly UserProduct[]>([]);
  const [quarantined, setQuarantined] = useState<readonly QuarantineEntry[]>([]);
  const [orders, setOrders] = useState<readonly ObservedOrder[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [lostData, setLostData] = useState(false);
  const [changedElsewhere, setChangedElsewhere] = useState(false);
  const quietUntil = useRef(0);
  const firstLoad = useRef(true);
  // Revisions this tab wrote. A stored revision that is not one of them was written by another tab.
  const ownRevisions = useRef<Set<number>>(new Set());

  const refresh = useCallback(async (p: Persistence) => {
    const [nextCart, products, entries, observed, nextSettings] = await Promise.all([
      p.cart.get(),
      p.userProducts.list(),
      p.quarantine.list(),
      p.orders.observeAll(),
      p.settings.get(),
    ]);
    setCart(nextCart);
    setUserProducts(products);
    setQuarantined(entries);
    setOrders(observed);
    setSettings(nextSettings);
    // The marker records only valuable data (orders, imported items): an emptied cart is not "lost data".
    const marker = dataMarker(markerStorage());
    if (observed.length > 0 || products.length > 0) marker.mark();
    else if (firstLoad.current && marker.hadData() && p.kind === "indexeddb") setLostData(true);
    if (observed.length > 0 || products.length > 0) setLostData(false);
    firstLoad.current = false;
    return nextCart;
  }, []);

  useEffect(() => {
    let cancelled = false;
    openOnce()
      .then(async (result) => {
        if (cancelled) return;
        setPersistence(result.persistence);
        setDegraded(result.degraded);
        await refresh(result.persistence);
        if (!cancelled) setStatus("ready");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const kind = storageKindOf(e);
        setFailure(failureOf(kind));
        setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Another tab (or window) committed a change: show what is stored now.
  useEffect(() => {
    if (!persistence || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("dreamcart-changes");
    channel.onmessage = () => {
      void refresh(persistence)
        .then((next) => {
          if (
            Date.now() > quietUntil.current &&
            ownRevisions.current.size > 0 &&
            !ownRevisions.current.has(next.revision)
          ) {
            setChangedElsewhere(true);
          }
        })
        .catch(() => undefined);
    };
    return () => channel.close();
  }, [persistence, refresh]);

  const mutate = useCallback(
    async (apply: (current: Cart) => CartResult): Promise<CartActionResult> => {
      if (!persistence) return { ok: false, error: "storage", kind: "unavailable" };
      setChangedElsewhere(false);
      let lostRace = false;
      const finish = (result: CartActionResult): CartActionResult => {
        // A lost race means another tab changed the cart while this action was in flight: say so.
        if (lostRace) setChangedElsewhere(true);
        return result;
      };
      try {
        for (let attempt = 0; attempt < SAVE_ATTEMPTS; attempt += 1) {
          const current = await persistence.cart.get();
          const result = apply(current);
          if (!result.ok) {
            setCart(result.cart);
            return finish({ ok: false, error: result.error, reason: result.reason });
          }
          if (result.cart === current) {
            setCart(current);
            return finish({ ok: true, cart: current });
          }
          // Registered before the save so the change notification of our own write is never mistaken for another tab's.
          const revision = result.cart.revision;
          ownRevisions.current.add(revision);
          const saved = await persistence.cart.save(result.cart);
          if (saved.ok) {
            setCart(saved.cart);
            return finish({ ok: true, cart: saved.cart });
          }
          // Lost a race with another tab: take what is stored and try again on top of it.
          ownRevisions.current.delete(revision);
          lostRace = true;
          setCart(saved.current);
        }
        return finish({ ok: false, error: "stale_revision" });
      } catch (e) {
        return finish({ ok: false, error: "storage", kind: storageKindOf(e) });
      }
    },
    [persistence],
  );

  const value = useMemo<LocalData>(
    () => ({
      status,
      failure,
      degraded,
      cart,
      userProducts,
      quarantined,
      orders,
      settings,
      lostData,
      changedElsewhere,
      dismissChangedElsewhere: () => setChangedElsewhere(false),
      addToCart: (line, eligibility) =>
        mutate((c) => addLine(c, line, eligibility, browserIds.uuid())),
      changeQuantity: (key, quantity) =>
        mutate((c) => setQuantity(c, key, quantity, browserIds.uuid())),
      removeFromCart: (key) => mutate((c) => removeLine(c, key, browserIds.uuid())),
      acceptCurrentPrices: (prices) =>
        mutate((c) => ({ ok: true, cart: acceptPrices(c, prices, browserIds.uuid()) })),
      importProduct: async (draft) => {
        if (!persistence) return { ok: false, error: "storage", kind: "unavailable" };
        const made = createUserProduct(draft, {
          nowMs: systemClock.nowMs(),
          uuid: browserIds.uuid(),
        });
        if (!made.ok) return { ok: false, error: "invalid", issues: made.issues };
        try {
          const existing = await persistence.userProducts.list();
          if (existing.length >= MAX_USER_PRODUCTS) return { ok: false, error: "limit" };
          await persistence.userProducts.put(made.product);
          setUserProducts(await persistence.userProducts.list());
          return { ok: true, product: made.product, removedParams: made.removedParams };
        } catch (e) {
          return { ok: false, error: "storage", kind: storageKindOf(e) };
        }
      },
      placeOrder: async (args) => {
        if (!persistence) return { ok: false, error: "storage", kind: "unavailable" };
        try {
          // The order empties the cart and bumps its revision by one: that change is ours.
          const stored = await persistence.cart.get();
          ownRevisions.current.add(stored.revision + 1);
          for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
            const outcome = await persistence.orders.placeOrder({
              idempotencyKey: args.idempotencyKey,
              resolveLine: args.resolveLine,
              nowMs: systemClock.nowMs(),
              scenario: args.scenario,
              destination: args.destination,
              payment: args.payment,
              acknowledged: args.acknowledged,
              catalogVersion: args.catalogVersion,
              orderId: browserIds.uuid(),
              code: formatOrderCode(browserIds.randomBytes(10)),
              nextCheckoutKey: browserIds.uuid(),
            });
            if (outcome.ok) {
              dataMarker(markerStorage()).mark();
              await persistence.settings.update({ defaultScenario: args.scenario });
              await refresh(persistence);
              return { ok: true, status: outcome.status, order: outcome.order };
            }
            if (outcome.error !== "code_collision") {
              ownRevisions.current.delete(stored.revision + 1);
              return outcome;
            }
          }
          return { ok: false, error: "storage", kind: "unknown" };
        } catch (e) {
          return { ok: false, error: "storage", kind: storageKindOf(e) };
        }
      },
      cancelOrder: async (id) => {
        if (!persistence) return { ok: false, error: "storage", kind: "unavailable" };
        try {
          const result = await persistence.orders.cancel(id);
          await refresh(persistence);
          return result;
        } catch (e) {
          return { ok: false, error: "storage", kind: storageKindOf(e) };
        }
      },
      advanceOrder: async (id) => {
        if (!persistence) return { ok: false, error: "storage", kind: "unavailable" };
        try {
          const result = await persistence.orders.advance(id);
          await refresh(persistence);
          return result;
        } catch (e) {
          return { ok: false, error: "storage", kind: storageKindOf(e) };
        }
      },
      recordProgress: async () => {
        if (!persistence) return;
        try {
          await refresh(persistence);
        } catch {
          // showing progress must never fail the page; the next view tries again
        }
      },
      dismissNotice: async (id) => {
        if (!persistence) return;
        try {
          const current = await persistence.settings.get();
          if (current.dismissedNotices.includes(id)) return;
          setSettings(
            await persistence.settings.update({
              dismissedNotices: [...current.dismissedNotices, id].slice(-50),
            }),
          );
        } catch {
          // a notice that cannot be remembered simply shows again
        }
      },
      deleteOrder: async (id) => {
        if (!persistence) return false;
        try {
          const removed = await persistence.orders.delete(id);
          await clearMarkerIfEmpty(persistence);
          await refresh(persistence);
          return removed;
        } catch {
          return false;
        }
      },
      updateSettings: async (patch) => {
        if (!persistence) return false;
        try {
          setSettings(await persistence.settings.update(patch));
          return true;
        } catch {
          return false;
        }
      },
      exportBackup: async () => {
        if (!persistence) return { ok: false, kind: "unavailable" };
        try {
          const bundle = await persistence.portability.exportAll();
          const day = new Date(systemClock.nowMs()).toISOString().slice(0, 10);
          return {
            ok: true,
            text: serializeBackup(bundle),
            filename: `dreamcart-sao-luu-${day}.json`,
            orders: bundle.data.orders.length,
          };
        } catch (e) {
          return { ok: false, kind: storageKindOf(e) };
        }
      },
      parseBackupText: parseBackup,
      restoreBackup: async (bundle, mode) => {
        if (!persistence) return { ok: false, kind: "unavailable" };
        try {
          quietUntil.current = Date.now() + QUIET_AFTER_BULK_MS;
          const report = await persistence.portability.importBundle(bundle, mode, {
            nextCheckoutKey: browserIds.uuid(),
          });
          ownRevisions.current.clear();
          await refresh(persistence);
          return { ok: true, report };
        } catch (e) {
          return { ok: false, kind: storageKindOf(e) };
        }
      },
      resetAll: async () => {
        if (!persistence) return false;
        try {
          quietUntil.current = Date.now() + QUIET_AFTER_BULK_MS;
          await persistence.deleteAllData();
          dataMarker(markerStorage()).clear();
          ownRevisions.current.clear();
          setLostData(false);
          await refresh(persistence);
          return true;
        } catch {
          return false;
        }
      },
      deleteUserProduct: async (id) => {
        if (!persistence) return false;
        try {
          const removed = await persistence.userProducts.delete(id);
          await clearMarkerIfEmpty(persistence);
          setUserProducts(await persistence.userProducts.list());
          return removed;
        } catch {
          return false;
        }
      },
    }),
    [
      status,
      failure,
      degraded,
      cart,
      userProducts,
      quarantined,
      orders,
      settings,
      lostData,
      changedElsewhere,
      mutate,
      persistence,
      refresh,
    ],
  );

  return <LocalDataContext value={value}>{children}</LocalDataContext>;
}

export function useLocalData(): LocalData {
  const value = useContext(LocalDataContext);
  if (!value) throw new Error("useLocalData must be used inside <LocalDataProvider>");
  return value;
}
