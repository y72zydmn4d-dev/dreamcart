import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StorageError } from "./errors";
import { openIndexedDbPersistence } from "./indexeddb-persistence";
import { openPersistence } from "./index";
import { MIGRATIONS, STORE, type Migration } from "./schema";
import { cartLine, makeDeps, placeCommand, placeOne, saveCartWith } from "./test-support";

/** Raw access to the same database, to plant records the application would never write. */
function rawOpen(factory: IDBFactory, name = "dreamcart"): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = factory.open(name);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function rawPut(factory: IDBFactory, store: string, value: unknown, key?: IDBValidKey) {
  const db = await rawOpen(factory);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    if (key === undefined) tx.objectStore(store).put(value);
    else tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

afterEach(() => vi.restoreAllMocks());

describe("persistence across reloads", () => {
  it("cart, orders, settings and imported products survive closing and reopening the database", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const first = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    const { order } = await placeOne(first, deps);
    const cart = await saveCartWith(first, deps.ids, cartLine("v2", "o2", 3));
    await first.settings.update({ defaultScenario: "fast" });
    first.close();

    const reloaded = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    expect(await reloaded.orders.get(order.id)).toEqual(order);
    expect(await reloaded.cart.get()).toEqual(cart);
    expect((await reloaded.settings.get()).defaultScenario).toBe("fast");
  });
});

describe("two tabs sharing one database", () => {
  it("a stale tab cannot overwrite a newer cart revision", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const tabA = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    const tabB = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    const base = await tabA.cart.get();
    expect(await tabB.cart.get()).toMatchObject({ lines: [], revision: 0 });

    const a = await saveCartWith(tabA, deps.ids, cartLine("v1"));
    const stale = await tabB.cart.save({
      ...base,
      revision: 1,
      checkoutKey: deps.ids.uuid(),
      lines: [cartLine("v9")],
    });
    expect(stale).toMatchObject({ ok: false, error: "stale_revision" });
    expect(await tabB.cart.get()).toEqual(a);
  });

  it("racing both tabs to save the same revision lets exactly one win", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const [tabA, tabB] = await Promise.all([
      openIndexedDbPersistence({ ...deps, indexedDB: factory }),
      openIndexedDbPersistence({ ...deps, indexedDB: factory }),
    ]);
    const base = await tabA.cart.get();
    const attempt = (tab: typeof tabA, variant: string) =>
      tab.cart.save({
        ...base,
        revision: 1,
        checkoutKey: deps.ids.uuid(),
        lines: [cartLine(variant)],
      });
    const results = await Promise.all([attempt(tabA, "a"), attempt(tabB, "b")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toHaveLength(1);
  });

  it("the same checkout submitted from both tabs creates one order", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const [tabA, tabB] = await Promise.all([
      openIndexedDbPersistence({ ...deps, indexedDB: factory }),
      openIndexedDbPersistence({ ...deps, indexedDB: factory }),
    ]);
    const cart = await saveCartWith(tabA, deps.ids, cartLine());
    const results = await Promise.all([
      tabA.orders.placeOrder(placeCommand(deps.clock, deps.ids, cart.checkoutKey)),
      tabB.orders.placeOrder(placeCommand(deps.clock, deps.ids, cart.checkoutKey)),
      tabA.orders.placeOrder(placeCommand(deps.clock, deps.ids, cart.checkoutKey)),
      tabB.orders.placeOrder(placeCommand(deps.clock, deps.ids, cart.checkoutKey)),
    ]);
    expect(results.filter((r) => r.ok && r.status === "created")).toHaveLength(1);
    expect(await tabA.orders.list()).toHaveLength(1);
    expect(await tabB.orders.list()).toHaveLength(1);
  });

  it("notifies after commits so other tabs can refresh, and never on a refused write", async () => {
    const factory = new IDBFactory();
    const events: string[] = [];
    const deps = makeDeps({ notify: (e) => events.push(e.store) });
    const p = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    await saveCartWith(p, deps.ids, cartLine());
    expect(events).toEqual(["cart"]);
    const base = await p.cart.get();
    await p.cart.save({ ...base, revision: 1, checkoutKey: deps.ids.uuid() }); // stale
    expect(events).toEqual(["cart"]);
    await p.deleteAllData();
    expect(events).toEqual(["cart", "all"]);
  });

  it("a failing notifier never fails a committed write", async () => {
    const deps = makeDeps({
      notify: () => {
        throw new Error("channel closed");
      },
    });
    const p = await openIndexedDbPersistence({ ...deps, indexedDB: new IDBFactory() });
    await expect(saveCartWith(p, deps.ids, cartLine())).resolves.toMatchObject({ revision: 1 });
  });
});

describe("transaction rollback", () => {
  it("a replace-import that fails halfway leaves existing data untouched", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const p = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    const { order } = await placeOne(p, deps);
    const cartBefore = await p.cart.get();
    const bundle = await p.portability.exportAll();
    // Bypass parseBackup on purpose: two orders with one id make the second insert violate the primary key.
    const poisoned = {
      ...bundle,
      data: { ...bundle.data, orders: [bundle.data.orders[0]!, bundle.data.orders[0]!] },
    };
    await expect(
      p.portability.importBundle(
        poisoned,
        { mode: "replace", confirmed: true },
        { nextCheckoutKey: "key-for-tests-1" },
      ),
    ).rejects.toBeInstanceOf(StorageError);
    expect(await p.orders.list()).toEqual([order]);
    expect(await p.cart.get()).toEqual(cartBefore);
  });

  it("a write that fails inside placeOrder rolls the order and the cart change back together", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const p = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    const cart = await saveCartWith(p, deps.ids, cartLine());
    // Let the order insert succeed and fail the following cart write.
    const original = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof original>
    ) {
      if (this.name === STORE.cart) throw new DOMException("simulated failure", "UnknownError");
      return original.apply(this, args);
    });
    await expect(
      p.orders.placeOrder(placeCommand(deps.clock, deps.ids, cart.checkoutKey)),
    ).rejects.toBeInstanceOf(StorageError);
    vi.restoreAllMocks();
    expect(await p.orders.list()).toEqual([]); // the already-added order was rolled back
    expect(await p.cart.get()).toEqual(cart); // and the cart is exactly as it was
  });
});

describe("schema versioning and migration", () => {
  const addIndex: Migration = (_db, tx) => {
    tx.objectStore(STORE.orders).createIndex("destination", "destination");
  };

  it("a new installation creates the current schema and records its version", async () => {
    const factory = new IDBFactory();
    const p = await openIndexedDbPersistence({ ...makeDeps(), indexedDB: factory });
    p.close();
    const db = await rawOpen(factory);
    expect(Array.from(db.objectStoreNames).sort()).toEqual([
      "cart",
      "meta",
      "orders",
      "quarantine",
      "settings",
      "userProducts",
    ]);
    expect(db.version).toBe(1);
    db.close();
  });

  it("upgrading an existing installation keeps all data and applies only the new step", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const v1 = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    const { order } = await placeOne(v1, deps);
    v1.close();

    const v2 = await openIndexedDbPersistence({
      ...deps,
      indexedDB: factory,
      version: 2,
      migrations: { ...MIGRATIONS, 2: addIndex },
    });
    expect(await v2.orders.get(order.id)).toEqual(order);
    v2.close();
    const db = await rawOpen(factory);
    expect(db.version).toBe(2);
    expect(Array.from(db.transaction(STORE.orders).objectStore(STORE.orders).indexNames)).toContain(
      "destination",
    );
    db.close();
  });

  it("a failing upgrade is rolled back as a whole: the old version and every record stay intact", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const v1 = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    const { order } = await placeOne(v1, deps);
    v1.close();

    const broken: Migration = (_db, tx) => {
      tx.objectStore(STORE.orders).createIndex("half-done", "id");
      throw new Error("migration bug");
    };
    const failure = await openIndexedDbPersistence({
      ...deps,
      indexedDB: factory,
      version: 2,
      migrations: { ...MIGRATIONS, 2: broken },
    }).catch((e) => e);
    expect(failure).toBeInstanceOf(StorageError);
    expect(failure.kind).toBe("migration_failed");

    const db = await rawOpen(factory);
    expect(db.version).toBe(1); // not half-upgraded
    expect(
      Array.from(db.transaction(STORE.orders).objectStore(STORE.orders).indexNames),
    ).not.toContain("half-done");
    db.close();
    const again = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    expect(await again.orders.get(order.id)).toEqual(order); // data survived
  });

  it("a database written by a newer DreamCart is never downgraded, deleted or hidden behind the fallback", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const newer = await openIndexedDbPersistence({
      ...deps,
      indexedDB: factory,
      version: 2,
      migrations: { ...MIGRATIONS, 2: addIndex },
    });
    const { order } = await placeOne(newer, deps);
    newer.close();

    const failure = await openIndexedDbPersistence({ ...deps, indexedDB: factory }).catch((e) => e);
    expect(failure).toMatchObject({ name: "StorageError", kind: "schema_too_new" });
    await expect(openPersistence({ ...deps, indexedDB: factory })).rejects.toMatchObject({
      kind: "schema_too_new",
    });

    const back = await openIndexedDbPersistence({
      ...deps,
      indexedDB: factory,
      version: 2,
      migrations: { ...MIGRATIONS, 2: addIndex },
    });
    expect(await back.orders.get(order.id)).toEqual(order);
  });

  it("an upgrade blocked by another open tab is reported, and the connection is not leaked", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    (await openIndexedDbPersistence({ ...deps, indexedDB: factory })).close();
    const stubborn = await rawOpen(factory); // an old tab that ignores versionchange
    const failure = await openIndexedDbPersistence({
      ...deps,
      indexedDB: factory,
      version: 2,
      migrations: { ...MIGRATIONS, 2: addIndex },
    }).catch((e) => e);
    expect(failure).toMatchObject({ name: "StorageError", kind: "blocked" });
    stubborn.close();
  });

  it("an open tab steps aside for another tab's upgrade and reconnects on next use", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const tab = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    const { order } = await placeOne(tab, deps);
    const upgraded = await openIndexedDbPersistence({
      ...deps,
      indexedDB: factory,
      version: 2,
      migrations: { ...MIGRATIONS, 2: addIndex },
    });
    upgraded.close();
    // the old tab still runs version 1 code: it cannot reconnect to a version-2 database, and says so
    await expect(tab.orders.get(order.id)).rejects.toMatchObject({ kind: "schema_too_new" });
  });
});

describe("corrupted records", () => {
  it("an invalid order is quarantined, left out of lists, and the rest still works", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const p = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    const { order } = await placeOne(p, deps);
    await rawPut(factory, STORE.orders, {
      id: "broken-order",
      code: "nope",
      idempotencyKey: "broken-key-1",
      createdAtMs: 5,
      items: "not an array",
    });
    expect((await p.orders.list()).map((o) => o.id)).toEqual([order.id]);
    const quarantined = await p.quarantine.list();
    expect(quarantined).toHaveLength(1);
    expect(quarantined[0]).toMatchObject({ store: "orders", key: "broken-order" });
    expect(await p.orders.get("broken-order")).toBeNull();
    expect((await p.orders.list()).length).toBe(1);
    await p.quarantine.clear();
    expect(await p.quarantine.list()).toEqual([]);
  });

  it("a corrupt cart record is quarantined and a clean cart is returned", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const p = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    await rawPut(factory, STORE.cart, { lines: "oops", revision: "x" }, "current");
    const cart = await p.cart.get();
    expect(cart).toMatchObject({ lines: [], revision: 0 });
    expect((await p.quarantine.list())[0]).toMatchObject({ store: "cart" });
    await expect(saveCartWith(p, deps.ids, cartLine())).resolves.toMatchObject({ revision: 1 });
  });

  it("a corrupt order under a checkout key stops placeOrder instead of guessing, and changes nothing", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const p = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    const cart = await saveCartWith(p, deps.ids, cartLine());
    await rawPut(factory, STORE.orders, {
      id: "bad",
      code: "x",
      idempotencyKey: cart.checkoutKey,
      createdAtMs: 1,
    });
    await expect(
      p.orders.placeOrder(placeCommand(deps.clock, deps.ids, cart.checkoutKey)),
    ).rejects.toMatchObject({ kind: "corrupt_data" });
    expect(await p.cart.get()).toEqual(cart);
  });

  it("invalid settings fall back to defaults without blocking the app", async () => {
    const factory = new IDBFactory();
    const p = await openIndexedDbPersistence({ ...makeDeps(), indexedDB: factory });
    await rawPut(factory, STORE.settings, { defaultScenario: "teleport" }, "current");
    expect(await p.settings.get()).toEqual({ defaultScenario: "quick", dismissedNotices: [] });
    expect((await p.quarantine.list())[0]).toMatchObject({ store: "settings" });
  });

  it("an export never includes a corrupt record", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const p = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    await placeOne(p, deps);
    await rawPut(factory, STORE.orders, {
      id: "broken",
      code: "x",
      idempotencyKey: "broken-key-2",
      createdAtMs: 2,
    });
    const bundle = await p.portability.exportAll();
    expect(bundle.data.orders).toHaveLength(1);
  });
});

describe("storage failures", () => {
  it("reports IndexedDB as unavailable, and openPersistence falls back to memory with the reason", async () => {
    const deps = makeDeps();
    const hole = {
      open: () => {
        throw new DOMException("denied", "SecurityError");
      },
    } as unknown as IDBFactory;
    await expect(openIndexedDbPersistence({ ...deps, indexedDB: hole })).rejects.toMatchObject({
      kind: "unavailable",
    });
    const result = await openPersistence({ ...deps, indexedDB: hole });
    expect(result.degraded).toBe("unavailable");
    expect(result.persistence.kind).toBe("memory");
    await expect(saveCartWith(result.persistence, deps.ids, cartLine())).resolves.toMatchObject({
      revision: 1,
    });
  });

  it("with no IndexedDB at all (global missing) it is unavailable rather than a crash", async () => {
    const result = await openPersistence({ ...makeDeps() }); // node has no global indexedDB
    expect(result).toMatchObject({ degraded: "unavailable" });
  });

  it("quota exceeded surfaces as a typed error and nothing is half-written", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const p = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    const cart = await saveCartWith(p, deps.ids, cartLine());
    const original = IDBObjectStore.prototype.add;
    vi.spyOn(IDBObjectStore.prototype, "add").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof original>
    ) {
      if (this.name === STORE.orders) throw new DOMException("full", "QuotaExceededError");
      return original.apply(this, args);
    });
    await expect(
      p.orders.placeOrder(placeCommand(deps.clock, deps.ids, cart.checkoutKey)),
    ).rejects.toMatchObject({ kind: "quota_exceeded" });
    vi.restoreAllMocks();
    expect(await p.orders.list()).toEqual([]);
    expect(await p.cart.get()).toEqual(cart);
    // after the storage problem clears, the same checkout works
    await expect(
      p.orders.placeOrder(placeCommand(deps.clock, deps.ids, cart.checkoutKey)),
    ).resolves.toMatchObject({ ok: true, status: "created" });
  });

  it("an aborted transaction is a typed error and a later retry succeeds", async () => {
    const factory = new IDBFactory();
    const deps = makeDeps();
    const p = await openIndexedDbPersistence({ ...deps, indexedDB: factory });
    const base = await p.cart.get();
    const original = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementationOnce(function () {
      throw new DOMException("aborted", "AbortError");
    });
    await expect(
      p.cart.save({ ...base, revision: 1, checkoutKey: deps.ids.uuid() }),
    ).rejects.toMatchObject({ kind: "aborted" });
    vi.restoreAllMocks();
    void original;
    await expect(saveCartWith(p, deps.ids, cartLine())).resolves.toMatchObject({ revision: 1 });
  });
});
