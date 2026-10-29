/**
 * The IndexedDB schema (docs/ARCHITECTURE.md §4). The database is versioned with `onupgradeneeded`
 * migrations: each step moves the database from version n-1 to n, runs inside the upgrade transaction, and is
 * rolled back as a whole if it throws. Migrations never delete user data.
 */
export const DB_NAME = "dreamcart";
export const DB_VERSION = 1;

export const STORE = {
  meta: "meta",
  cart: "cart",
  orders: "orders",
  userProducts: "userProducts",
  settings: "settings",
  quarantine: "quarantine",
} as const;
export type StoreName = (typeof STORE)[keyof typeof STORE];
export const ALL_STORES: StoreName[] = Object.values(STORE);

/** The single record keys of the singleton stores. */
export const CURRENT = "current";

export type Migration = (db: IDBDatabase, tx: IDBTransaction) => void;

export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: (db) => {
    db.createObjectStore(STORE.meta, { keyPath: "key" });
    db.createObjectStore(STORE.cart); // one record under CURRENT
    const orders = db.createObjectStore(STORE.orders, { keyPath: "id" });
    orders.createIndex("idempotencyKey", "idempotencyKey", { unique: true });
    orders.createIndex("code", "code", { unique: true });
    orders.createIndex("createdAtMs", "createdAtMs");
    db.createObjectStore(STORE.userProducts, { keyPath: "id" });
    db.createObjectStore(STORE.settings); // one record under CURRENT
    db.createObjectStore(STORE.quarantine, { autoIncrement: true });
  },
};

/** Apply every step in `(oldVersion, newVersion]` in order. A missing step is a programming error and aborts. */
export function applyMigrations(
  migrations: Readonly<Record<number, Migration>>,
  db: IDBDatabase,
  tx: IDBTransaction,
  oldVersion: number,
  newVersion: number,
): void {
  for (let v = oldVersion + 1; v <= newVersion; v++) {
    const step = migrations[v];
    if (!step) throw new Error(`No migration to database version ${v}`);
    step(db, tx);
  }
}
