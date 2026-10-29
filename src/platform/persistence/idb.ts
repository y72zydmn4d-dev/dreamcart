import { classifyStorageError, StorageError } from "./errors";

/** Promise wrapper for one IDB request. */
export function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

/** Resolves when the transaction commits; rejects (classified) if it aborts or errors. */
function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new DOMException("Transaction aborted", "AbortError"));
    tx.onerror = () => reject(tx.error ?? new Error("Transaction failed"));
  });
}

/** Throw inside a transaction callback to roll everything back and return `value` to the caller. */
export class Rollback<T> {
  constructor(readonly value: T) {}
}

/**
 * Run `fn` inside one transaction. A normal return commits; any thrown error aborts (all writes undone) and is
 * rethrown as a `StorageError`; a thrown `Rollback` aborts and returns its value. `fn` must only await IDB
 * requests: awaiting anything else lets the transaction auto-commit early.
 */
export async function runTransaction<T>(
  db: IDBDatabase,
  stores: string | string[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  let tx: IDBTransaction;
  try {
    tx = db.transaction(stores, mode);
  } catch (e) {
    throw classifyStorageError(e);
  }
  const done = transactionDone(tx);
  done.catch(() => undefined); // the outcome is read below; avoid an unhandled rejection on early abort
  let result: T;
  try {
    result = await fn(tx);
  } catch (e) {
    try {
      tx.abort();
    } catch {
      // already finished or aborted
    }
    await done.catch(() => undefined);
    if (e instanceof Rollback) return e.value as T;
    throw classifyStorageError(e);
  }
  try {
    await done;
  } catch (e) {
    throw classifyStorageError(e);
  }
  return result;
}

export const corruptData = (what: string): StorageError =>
  new StorageError("corrupt_data", `Corrupt record: ${what}`);
