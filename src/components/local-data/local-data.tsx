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
import type { IneligibleReason, OfferEvaluation } from "@/modules/pricing";
import type { Money } from "@/modules/shared/domain/money";
import {
  browserIds,
  classifyStorageError,
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

export interface LocalData {
  readonly status: LocalDataStatus;
  /** Why storage could not be opened at all (newer database, failed upgrade, blocked upgrade). */
  readonly failure: StorageFailure | null;
  /** Set when data only lives in memory and will be lost when the page closes. */
  readonly degraded: StorageErrorKind | null;
  readonly cart: Cart | null;
  readonly userProducts: readonly UserProduct[];
  readonly quarantined: readonly QuarantineEntry[];
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
  const [changedElsewhere, setChangedElsewhere] = useState(false);
  // Revisions this tab wrote. A stored revision that is not one of them was written by another tab.
  const ownRevisions = useRef<Set<number>>(new Set());

  const refresh = useCallback(async (p: Persistence) => {
    const [nextCart, products, entries] = await Promise.all([
      p.cart.get(),
      p.userProducts.list(),
      p.quarantine.list(),
    ]);
    setCart(nextCart);
    setUserProducts(products);
    setQuarantined(entries);
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
          if (ownRevisions.current.size > 0 && !ownRevisions.current.has(next.revision)) {
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
      deleteUserProduct: async (id) => {
        if (!persistence) return false;
        try {
          const removed = await persistence.userProducts.delete(id);
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
      changedElsewhere,
      mutate,
      persistence,
    ],
  );

  return <LocalDataContext value={value}>{children}</LocalDataContext>;
}

export function useLocalData(): LocalData {
  const value = useContext(LocalDataContext);
  if (!value) throw new Error("useLocalData must be used inside <LocalDataProvider>");
  return value;
}
