import {
  afterOrderPlaced,
  cartSchema,
  emptyCart,
  type Cart,
  type CartRepository,
} from "@/modules/cart";
import { userProductSchema, type UserProduct } from "@/modules/catalog";
import {
  buildBackup,
  planMerge,
  type BackupBundle,
  type ImportMode,
  type ImportReport,
  type PortabilityRepository,
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
  type PlaceOrderCommand,
  type PlaceOrderOutcome,
  type ProgressState,
  type VirtualOrder,
} from "@/modules/orders";
import {
  applySettingsPatch,
  DEFAULT_SETTINGS,
  parseSettingsOrDefault,
  type Settings,
  type SettingsRepository,
} from "@/modules/settings";
import { APP_VERSION } from "@/config/app-info";
import { classifyStorageError, isConstraintError, StorageError } from "./errors";
import { req, Rollback, runTransaction } from "./idb";
import {
  ALL_STORES,
  applyMigrations,
  CURRENT,
  DB_NAME,
  DB_VERSION,
  MIGRATIONS,
  STORE,
  type Migration,
} from "./schema";
import type {
  ChangeEvent,
  Persistence,
  PersistenceDeps,
  QuarantineEntry,
  QuarantinedStore,
  UserProductRepository,
} from "./types";
import type { ZodType } from "zod";

export interface OpenOptions extends PersistenceDeps {
  /** Defaults to the global `indexedDB`. */
  readonly indexedDB?: IDBFactory;
  readonly dbName?: string;
  /** Overridable so tests can exercise upgrades; production uses `DB_VERSION` and `MIGRATIONS`. */
  readonly version?: number;
  readonly migrations?: Readonly<Record<number, Migration>>;
}

function openDatabase(
  factory: IDBFactory,
  name: string,
  version: number,
  migrations: Readonly<Record<number, Migration>>,
) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(name, version);
    } catch (e) {
      reject(classifyStorageError(e));
      return;
    }
    let migrationError: unknown = null;
    let settled = false;
    const fail = (error: StorageError) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };
    request.onupgradeneeded = (event) => {
      const tx = request.transaction!;
      try {
        applyMigrations(
          migrations,
          request.result,
          tx,
          event.oldVersion,
          event.newVersion ?? version,
        );
      } catch (e) {
        migrationError = e;
        tx.abort(); // rolls back the whole upgrade: the database stays at its previous version, data intact
      }
    };
    request.onblocked = () =>
      fail(
        new StorageError(
          "blocked",
          "Another DreamCart tab is still using an older version of the database.",
        ),
      );
    request.onerror = () => {
      if (migrationError) {
        fail(
          new StorageError(
            "migration_failed",
            `Database upgrade failed: ${String(migrationError)}`,
            { cause: migrationError },
          ),
        );
      } else {
        fail(classifyStorageError(request.error));
      }
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close(); // we already reported "blocked"; do not leak the connection
        return;
      }
      settled = true;
      resolve(request.result);
    };
  });
}

/** Parse a stored value; undefined when absent, `null` when present but invalid. */
function parseStored<T>(schema: ZodType<T>, value: unknown): T | undefined | null {
  if (value === undefined) return undefined;
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function openIndexedDbPersistence(options: OpenOptions): Promise<Persistence> {
  const factory = options.indexedDB ?? (typeof indexedDB === "undefined" ? undefined : indexedDB);
  if (!factory)
    throw new StorageError("unavailable", "IndexedDB is not available in this browser context.");
  const name = options.dbName ?? DB_NAME;
  const version = options.version ?? DB_VERSION;
  const migrations = options.migrations ?? MIGRATIONS;
  const { clock, ids } = options;
  const notify = (event: ChangeEvent) => {
    try {
      options.notify?.(event);
    } catch {
      // a notification failure must never fail a committed write
    }
  };

  let db = await openDatabase(factory, name, version, migrations);
  let closing = false;
  const watch = (d: IDBDatabase) => {
    // Another tab wants to upgrade: let it. This connection is reopened lazily on next use.
    d.onversionchange = () => {
      d.close();
      closing = true;
    };
    d.onclose = () => {
      closing = true;
    };
  };
  watch(db);
  const connection = async (): Promise<IDBDatabase> => {
    if (closing) {
      db = await openDatabase(factory, name, version, migrations);
      closing = false;
      watch(db);
    }
    return db;
  };
  const tx = async <T>(
    stores: string | string[],
    mode: IDBTransactionMode,
    fn: (t: IDBTransaction) => Promise<T>,
  ) => runTransaction(await connection(), stores, mode, fn);

  await tx(STORE.meta, "readwrite", async (t) => {
    const meta = t.objectStore(STORE.meta);
    await req(meta.put({ key: "schemaVersion", value: version }));
    if ((await req(meta.get("createdAtMs"))) === undefined) {
      await req(meta.put({ key: "createdAtMs", value: clock.nowMs() }));
    }
  });

  /** Move a record that failed validation into the quarantine store (inside the caller's transaction). */
  const quarantine = async (
    t: IDBTransaction,
    store: QuarantinedStore,
    key: string,
    payload: unknown,
    reason: string,
  ) => {
    await req(
      t
        .objectStore(STORE.quarantine)
        .add({ store, key, reason, quarantinedAtMs: clock.nowMs(), payload } satisfies Omit<
          QuarantineEntry,
          "id"
        >),
    );
  };

  const freshCart = (): Cart => emptyCart(ids.uuid());

  /** Read the cart record; an invalid one is quarantined and removed so the next read starts clean. */
  async function readCart(t: IDBTransaction): Promise<Cart | undefined> {
    const store = t.objectStore(STORE.cart);
    const parsed = parseStored(cartSchema, await req(store.get(CURRENT)));
    if (parsed === null) {
      const raw = await req(store.get(CURRENT));
      await quarantine(t, "cart", CURRENT, raw, "cart failed validation");
      await req(store.delete(CURRENT));
      return undefined;
    }
    return parsed;
  }

  async function readOrder(t: IDBTransaction, id: string): Promise<VirtualOrder | null> {
    const store = t.objectStore(STORE.orders);
    const raw = await req(store.get(id));
    if (raw === undefined) return null;
    const parsed = virtualOrderSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    await quarantine(t, "orders", id, raw, "order failed validation");
    await req(store.delete(id));
    return null;
  }

  /** All valid orders, newest first; invalid ones are quarantined and removed. */
  async function scanOrders(t: IDBTransaction): Promise<VirtualOrder[]> {
    const store = t.objectStore(STORE.orders);
    const raws = (await req(store.index("createdAtMs").getAll())) as unknown[];
    const valid: VirtualOrder[] = [];
    for (const raw of raws) {
      const parsed = virtualOrderSchema.safeParse(raw);
      if (parsed.success) valid.push(parsed.data);
      else {
        const id = String((raw as { id?: unknown } | null)?.id ?? "unknown");
        await quarantine(t, "orders", id, raw, "order failed validation");
        if (id !== "unknown") await req(store.delete(id));
      }
    }
    return valid.reverse();
  }

  const cart: CartRepository = {
    async get() {
      return (await tx([STORE.cart, STORE.quarantine], "readwrite", readCart)) ?? freshCart();
    },
    async save(next) {
      const candidate = cartSchema.parse(next);
      const result = await tx([STORE.cart, STORE.quarantine], "readwrite", async (t) => {
        const stored = await readCart(t);
        const storedRevision = stored?.revision ?? 0;
        if (candidate.revision !== storedRevision + 1) {
          return {
            ok: false as const,
            error: "stale_revision" as const,
            current: stored ?? freshCart(),
          };
        }
        await req(t.objectStore(STORE.cart).put(candidate, CURRENT));
        return { ok: true as const, cart: candidate };
      });
      if (result.ok) notify({ store: "cart" });
      return result;
    },
  };

  const orders: OrderRepository = {
    async placeOrder(command: PlaceOrderCommand): Promise<PlaceOrderOutcome> {
      const outcome = await tx(
        [STORE.cart, STORE.orders, STORE.quarantine],
        "readwrite",
        async (t): Promise<PlaceOrderOutcome> => {
          const rawExisting = await req(
            t.objectStore(STORE.orders).index("idempotencyKey").get(command.idempotencyKey),
          );
          let existing: VirtualOrder | null = null;
          if (rawExisting !== undefined) {
            const parsed = virtualOrderSchema.safeParse(rawExisting);
            // Replaying onto a corrupt record would be a guess: fail loudly and change nothing.
            if (!parsed.success)
              throw new StorageError(
                "corrupt_data",
                "The order stored for this checkout is corrupt.",
              );
            existing = parsed.data;
          }
          const stored = await readCart(t);
          const result = decidePlaceOrder(
            { ...command, cart: stored ?? emptyCart("no-cart") },
            existing,
          );
          if (!result.ok) return result;
          if (result.status === "existing") return result;
          try {
            await req(t.objectStore(STORE.orders).add(result.order));
          } catch (e) {
            if (isConstraintError(e))
              throw new Rollback<PlaceOrderOutcome>({ ok: false, error: "code_collision" });
            throw e;
          }
          await req(
            t
              .objectStore(STORE.cart)
              .put(afterOrderPlaced(stored!, command.nextCheckoutKey), CURRENT),
          );
          return result;
        },
      );
      if (outcome.ok && outcome.status === "created") notify({ store: "all" });
      return outcome;
    },

    async get(id) {
      return tx([STORE.orders, STORE.quarantine], "readwrite", (t) => readOrder(t, id));
    },
    async list() {
      return tx([STORE.orders, STORE.quarantine], "readwrite", scanOrders);
    },

    async observe(id): Promise<ObservedOrder | null> {
      const result = await tx([STORE.orders, STORE.quarantine], "readwrite", async (t) => {
        const order = await readOrder(t, id);
        if (!order) return null;
        const observed = observeOrderState(order.simulation, clock.nowMs());
        if (observed.record !== order.simulation) {
          await req(t.objectStore(STORE.orders).put({ ...order, simulation: observed.record }));
        }
        return { order: { ...order, simulation: observed.record }, state: observed.state };
      });
      return result;
    },
    async observeAll(): Promise<ObservedOrder[]> {
      return tx([STORE.orders, STORE.quarantine], "readwrite", async (t) => {
        const now = clock.nowMs();
        const out: ObservedOrder[] = [];
        for (const order of await scanOrders(t)) {
          const observed = observeOrderState(order.simulation, now);
          const next =
            observed.record !== order.simulation
              ? { ...order, simulation: observed.record }
              : order;
          if (next !== order) await req(t.objectStore(STORE.orders).put(next));
          out.push({ order: next, state: observed.state });
        }
        return out;
      });
    },

    async advance(id) {
      return mutate(id, (order, now) => advanceManually(order.simulation, now));
    },
    async cancel(id) {
      return mutate(id, (order, now) => cancelOrder(order.simulation, now));
    },

    async recordHighWater(id, state: ProgressState) {
      await tx([STORE.orders, STORE.quarantine], "readwrite", async (t) => {
        const order = await readOrder(t, id);
        if (!order || orderStateIndex(state) <= orderStateIndex(order.simulation.highWater)) return;
        await req(
          t
            .objectStore(STORE.orders)
            .put({ ...order, simulation: { ...order.simulation, highWater: state } }),
        );
      });
      notify({ store: "orders" });
    },

    async delete(id) {
      const removed = await tx(STORE.orders, "readwrite", async (t) => {
        const store = t.objectStore(STORE.orders);
        if ((await req(store.getKey(id))) === undefined) return false;
        await req(store.delete(id));
        return true;
      });
      if (removed) notify({ store: "orders" });
      return removed;
    },
    async deleteAll() {
      await tx(STORE.orders, "readwrite", (t) =>
        req(t.objectStore(STORE.orders).clear()).then(() => undefined),
      );
      notify({ store: "orders" });
    },
  };

  /** Evaluate a transition with the clock at this moment and write it in the same transaction. */
  async function mutate(
    id: string,
    decide: (order: VirtualOrder, nowMs: number) => ReturnType<typeof advanceManually>,
  ): Promise<OrderMutationResult> {
    const result = await tx(
      [STORE.orders, STORE.quarantine],
      "readwrite",
      async (t): Promise<OrderMutationResult> => {
        const order = await readOrder(t, id);
        if (!order) return { ok: false, error: "not_found" };
        const decision = decide(order, clock.nowMs());
        if (!decision.ok) return { ok: false, error: decision.error, state: decision.state };
        const next = virtualOrderSchema.parse({ ...order, simulation: decision.record });
        await req(t.objectStore(STORE.orders).put(next));
        return { ok: true, order: next, state: decision.state };
      },
    );
    if (result.ok) notify({ store: "orders" });
    return result;
  }

  const userProducts: UserProductRepository = {
    async list() {
      return tx([STORE.userProducts, STORE.quarantine], "readwrite", async (t) => {
        const raws = (await req(t.objectStore(STORE.userProducts).getAll())) as unknown[];
        const valid: UserProduct[] = [];
        for (const raw of raws) {
          const parsed = userProductSchema.safeParse(raw);
          if (parsed.success) valid.push(parsed.data);
          else {
            const id = String((raw as { id?: unknown } | null)?.id ?? "unknown");
            await quarantine(t, "userProducts", id, raw, "imported product failed validation");
            if (id !== "unknown") await req(t.objectStore(STORE.userProducts).delete(id));
          }
        }
        return valid.sort((a, b) => b.createdAtMs - a.createdAtMs);
      });
    },
    async put(product) {
      await tx(STORE.userProducts, "readwrite", (t) =>
        req(t.objectStore(STORE.userProducts).put(userProductSchema.parse(product))).then(
          () => undefined,
        ),
      );
      notify({ store: "userProducts" });
    },
    async delete(id) {
      const removed = await tx(STORE.userProducts, "readwrite", async (t) => {
        const store = t.objectStore(STORE.userProducts);
        if ((await req(store.getKey(id))) === undefined) return false;
        await req(store.delete(id));
        return true;
      });
      if (removed) notify({ store: "userProducts" });
      return removed;
    },
  };

  const readSettings = async (t: IDBTransaction): Promise<Settings> => {
    const raw = await req(t.objectStore(STORE.settings).get(CURRENT));
    if (raw === undefined) return DEFAULT_SETTINGS;
    const { settings, valid } = parseSettingsOrDefault(raw);
    if (!valid) await quarantine(t, "settings", CURRENT, raw, "settings failed validation");
    return settings;
  };

  const settings: SettingsRepository = {
    get: () => tx([STORE.settings, STORE.quarantine], "readwrite", readSettings),
    async update(patch) {
      const next = await tx([STORE.settings, STORE.quarantine], "readwrite", async (t) => {
        const updated = applySettingsPatch(await readSettings(t), patch);
        await req(t.objectStore(STORE.settings).put(updated, CURRENT));
        return updated;
      });
      notify({ store: "settings" });
      return next;
    },
  };

  const portability: PortabilityRepository = {
    async exportAll(): Promise<BackupBundle> {
      const stores = [
        STORE.cart,
        STORE.orders,
        STORE.userProducts,
        STORE.settings,
        STORE.quarantine,
      ];
      // One transaction = one consistent snapshot. Corrupt records are quarantined, never exported.
      return tx(stores, "readwrite", async (t) => {
        const storedCart = await readCart(t);
        const list = await scanOrders(t);
        const products = (await req(t.objectStore(STORE.userProducts).getAll())) as unknown[];
        const validProducts = products.flatMap((p) => {
          const parsed = userProductSchema.safeParse(p);
          return parsed.success ? [parsed.data] : [];
        });
        return buildBackup({
          cartLines: storedCart?.lines ?? [],
          orders: list,
          userProducts: validProducts,
          settings: await readSettings(t),
          exportedAtMs: clock.nowMs(),
          appVersion: options.appVersion ?? APP_VERSION,
        });
      });
    },

    async importBundle(bundle, mode: ImportMode, context): Promise<ImportReport> {
      if (mode.mode === "replace" && mode.confirmed !== true) {
        throw new TypeError("Replacing local data requires explicit confirmation.");
      }
      const stores = [
        STORE.cart,
        STORE.orders,
        STORE.userProducts,
        STORE.settings,
        STORE.quarantine,
      ];
      const report = await tx(stores, "readwrite", async (t): Promise<ImportReport> => {
        const orderStore = t.objectStore(STORE.orders);
        if (mode.mode === "merge") {
          const plan = planMerge(bundle.data.orders, await scanOrders(t));
          for (const order of plan.toAdd) await req(orderStore.add(order)); // a violation aborts the whole import
          return {
            mode: "merge",
            addedOrders: plan.toAdd.length,
            skippedExisting: plan.skippedExisting.length,
            conflicts: plan.conflicts,
            removedOrders: 0,
          };
        }
        const removedOrders = (await req(orderStore.count())) as number;
        await req(orderStore.clear());
        await req(t.objectStore(STORE.userProducts).clear());
        for (const order of bundle.data.orders) await req(orderStore.add(order));
        for (const product of bundle.data.userProducts)
          await req(t.objectStore(STORE.userProducts).put(product));
        const previous = await readCart(t);
        await req(
          t.objectStore(STORE.cart).put(
            cartSchema.parse({
              lines: bundle.data.cart.lines,
              revision: (previous?.revision ?? 0) + 1,
              checkoutKey: context.nextCheckoutKey,
            }),
            CURRENT,
          ),
        );
        await req(t.objectStore(STORE.settings).put(bundle.data.settings, CURRENT));
        return {
          mode: "replace",
          addedOrders: bundle.data.orders.length,
          skippedExisting: 0,
          conflicts: [],
          removedOrders,
        };
      });
      notify({ store: "all" });
      return report;
    },
  };

  const quarantineApi: Persistence["quarantine"] = {
    async list() {
      const rows = await tx(STORE.quarantine, "readonly", async (t) => {
        const store = t.objectStore(STORE.quarantine);
        const keys = (await req(store.getAllKeys())) as number[];
        const values = (await req(store.getAll())) as Omit<QuarantineEntry, "id">[];
        return values.map((v, i) => ({ ...v, id: keys[i]! }));
      });
      return rows;
    },
    async clear() {
      await tx(STORE.quarantine, "readwrite", (t) =>
        req(t.objectStore(STORE.quarantine).clear()).then(() => undefined),
      );
    },
  };

  return {
    kind: "indexeddb",
    cart,
    orders,
    userProducts,
    settings,
    portability,
    quarantine: quarantineApi,
    async deleteAllData() {
      await tx(
        ALL_STORES.filter((s) => s !== STORE.meta),
        "readwrite",
        async (t) => {
          for (const name of ALL_STORES)
            if (name !== STORE.meta) await req(t.objectStore(name).clear());
        },
      );
      notify({ store: "all" });
    },
    close() {
      closing = true;
      db.close();
    },
  };
}
