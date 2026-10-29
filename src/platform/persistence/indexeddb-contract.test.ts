import { IDBFactory } from "fake-indexeddb";
import { describePersistenceContract } from "./persistence.contract";
import { openIndexedDbPersistence } from "./indexeddb-persistence";
import { makeDeps } from "./test-support";

// A fresh in-memory IndexedDB per test: spec-compliant transactions, indexes and constraints.
describePersistenceContract("indexeddb (fake-indexeddb)", async () => {
  const deps = makeDeps();
  const open = () => openIndexedDbPersistence({ ...deps, indexedDB: new IDBFactory() });
  return { p: await open(), clock: deps.clock, ids: deps.ids as never, fresh: open };
});
