import { afterOrderPlaced, cartSchema, emptyCart, type Cart } from "@/modules/cart";
import { userProductSchema, type UserProduct } from "@/modules/catalog";
import {
  buildBackup,
  planMerge,
  type ImportMode,
  type ImportReport,
} from "@/modules/data-portability";
import {
  advanceManually,
  cancelOrder,
  observeOrderState,
  orderStateIndex,
  placeOrder as decidePlaceOrder,
  virtualOrderSchema,
  type ObservedOrder,
  type OrderMutationResult,
  type OrderRepository,
  type VirtualOrder,
} from "@/modules/orders";
import { applySettingsPatch, DEFAULT_SETTINGS, type Settings } from "@/modules/settings";
import { APP_VERSION } from "@/config/app-info";
import type { ChangeEvent, Persistence, PersistenceDeps } from "./types";

const copy = <T>(value: T): T => structuredClone(value);

/**
 * In-memory adapter: the fallback when IndexedDB is unavailable (data is lost when the page closes, and the UI
 * says so), and the fast adapter for tests of everything above storage. Every operation runs synchronously
 * between its read and its write, so it is atomic for the same reason a single IndexedDB transaction is.
 */
export function createMemoryPersistence(deps: PersistenceDeps): Persistence {
  const { clock, ids } = deps;
  let cartRecord: Cart | undefined;
  const orderMap = new Map<string, VirtualOrder>();
  const productMap = new Map<string, UserProduct>();
  let settingsRecord: Settings = DEFAULT_SETTINGS;
  const notify = (event: ChangeEvent) => deps.notify?.(event);

  const freshCart = () => emptyCart(ids.uuid());
  const newestFirst = () =>
    [...orderMap.values()].sort((a, b) => b.createdAtMs - a.createdAtMs || (a.id < b.id ? 1 : -1));
  const idempotencyIndex = (key: string) =>
    [...orderMap.values()].find((o) => o.idempotencyKey === key);
  const hasCode = (code: string) => [...orderMap.values()].some((o) => o.code === code);

  const orders: OrderRepository = {
    async placeOrder(command) {
      const existing = idempotencyIndex(command.idempotencyKey) ?? null;
      const result = decidePlaceOrder(
        { ...command, cart: copy(cartRecord ?? emptyCart("no-cart")) },
        existing && copy(existing),
      );
      if (!result.ok || result.status === "existing") return copy(result);
      if (hasCode(result.order.code) || orderMap.has(result.order.id))
        return { ok: false, error: "code_collision" };
      orderMap.set(result.order.id, copy(result.order));
      cartRecord = afterOrderPlaced(cartRecord!, command.nextCheckoutKey);
      notify({ store: "all" });
      return copy(result);
    },
    async get(id) {
      const order = orderMap.get(id);
      return order ? copy(order) : null;
    },
    async list() {
      return copy(newestFirst());
    },
    async observe(id): Promise<ObservedOrder | null> {
      const order = orderMap.get(id);
      if (!order) return null;
      const observed = observeOrderState(order.simulation, clock.nowMs());
      const next = { ...order, simulation: observed.record };
      orderMap.set(id, next);
      return copy({ order: next, state: observed.state });
    },
    async observeAll() {
      const now = clock.nowMs();
      return newestFirst().map((order) => {
        const observed = observeOrderState(order.simulation, now);
        const next = { ...order, simulation: observed.record };
        orderMap.set(order.id, next);
        return copy({ order: next, state: observed.state });
      });
    },
    async advance(id) {
      return mutate(id, (o, now) => advanceManually(o.simulation, now));
    },
    async cancel(id) {
      return mutate(id, (o, now) => cancelOrder(o.simulation, now));
    },
    async recordHighWater(id, state) {
      const order = orderMap.get(id);
      if (!order || orderStateIndex(state) <= orderStateIndex(order.simulation.highWater)) return;
      orderMap.set(id, { ...order, simulation: { ...order.simulation, highWater: state } });
      notify({ store: "orders" });
    },
    async delete(id) {
      const removed = orderMap.delete(id);
      if (removed) notify({ store: "orders" });
      return removed;
    },
    async deleteAll() {
      orderMap.clear();
      notify({ store: "orders" });
    },
  };

  function mutate(
    id: string,
    decide: (o: VirtualOrder, now: number) => ReturnType<typeof advanceManually>,
  ): OrderMutationResult {
    const order = orderMap.get(id);
    if (!order) return { ok: false, error: "not_found" };
    const decision = decide(order, clock.nowMs());
    if (!decision.ok) return { ok: false, error: decision.error, state: decision.state };
    const next = virtualOrderSchema.parse({ ...order, simulation: decision.record });
    orderMap.set(id, next);
    notify({ store: "orders" });
    return copy({ ok: true, order: next, state: decision.state });
  }

  return {
    kind: "memory",
    cart: {
      async get() {
        return copy(cartRecord ?? freshCart());
      },
      async save(next) {
        const candidate = cartSchema.parse(next);
        const storedRevision = cartRecord?.revision ?? 0;
        if (candidate.revision !== storedRevision + 1) {
          return { ok: false, error: "stale_revision", current: copy(cartRecord ?? freshCart()) };
        }
        cartRecord = copy(candidate);
        notify({ store: "cart" });
        return { ok: true, cart: copy(candidate) };
      },
    },
    orders,
    userProducts: {
      async list() {
        return copy([...productMap.values()].sort((a, b) => b.createdAtMs - a.createdAtMs));
      },
      async put(product) {
        productMap.set(product.id, copy(userProductSchema.parse(product)));
        notify({ store: "userProducts" });
      },
      async delete(id) {
        const removed = productMap.delete(id);
        if (removed) notify({ store: "userProducts" });
        return removed;
      },
    },
    settings: {
      async get() {
        return copy(settingsRecord);
      },
      async update(patch) {
        settingsRecord = applySettingsPatch(settingsRecord, patch);
        notify({ store: "settings" });
        return copy(settingsRecord);
      },
    },
    portability: {
      async exportAll() {
        return buildBackup({
          cartLines: copy(cartRecord?.lines ?? []),
          orders: copy([...orderMap.values()]),
          userProducts: copy([...productMap.values()]),
          settings: copy(settingsRecord),
          exportedAtMs: clock.nowMs(),
          appVersion: deps.appVersion ?? APP_VERSION,
        });
      },
      async importBundle(bundle, mode: ImportMode, context): Promise<ImportReport> {
        if (mode.mode === "replace" && mode.confirmed !== true) {
          throw new TypeError("Replacing local data requires explicit confirmation.");
        }
        if (mode.mode === "merge") {
          const plan = planMerge(bundle.data.orders, [...orderMap.values()]);
          for (const order of plan.toAdd) orderMap.set(order.id, copy(order));
          notify({ store: "all" });
          return {
            mode: "merge",
            addedOrders: plan.toAdd.length,
            skippedExisting: plan.skippedExisting.length,
            conflicts: plan.conflicts,
            removedOrders: 0,
          };
        }
        const removedOrders = orderMap.size;
        orderMap.clear();
        productMap.clear();
        for (const order of bundle.data.orders) orderMap.set(order.id, copy(order));
        for (const product of bundle.data.userProducts) productMap.set(product.id, copy(product));
        cartRecord = cartSchema.parse({
          lines: copy(bundle.data.cart.lines),
          revision: (cartRecord?.revision ?? 0) + 1,
          checkoutKey: context.nextCheckoutKey,
        });
        settingsRecord = copy(bundle.data.settings);
        notify({ store: "all" });
        return {
          mode: "replace",
          addedOrders: bundle.data.orders.length,
          skippedExisting: 0,
          conflicts: [],
          removedOrders,
        };
      },
    },
    quarantine: {
      async list() {
        return [];
      },
      async clear() {},
    },
    async deleteAllData() {
      cartRecord = undefined;
      orderMap.clear();
      productMap.clear();
      settingsRecord = DEFAULT_SETTINGS;
      notify({ store: "all" });
    },
    close() {},
  };
}
