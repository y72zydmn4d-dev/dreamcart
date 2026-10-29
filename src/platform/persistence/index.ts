import { StorageError } from "./errors";
import { openIndexedDbPersistence, type OpenOptions } from "./indexeddb-persistence";
import { createMemoryPersistence } from "./memory-persistence";
import type { FallbackResult, Persistence } from "./types";

export { StorageError, classifyStorageError } from "./errors";
export type { StorageErrorKind } from "./errors";
export { createMemoryPersistence } from "./memory-persistence";
export { openIndexedDbPersistence } from "./indexeddb-persistence";
export type { OpenOptions } from "./indexeddb-persistence";
export { DB_NAME, DB_VERSION } from "./schema";
export { browserIds, createBroadcastNotifier, dataMarker, systemClock } from "./environment";
export type * from "./types";

/**
 * Open IndexedDB. If the browser cannot provide it (unavailable, blocked, quota) fall back to memory so the app
 * stays usable, and report why so the UI can show a persistent "data is not being saved" banner. A database from
 * a newer DreamCart, a failed upgrade or another tab blocking the upgrade is NOT hidden behind the fallback:
 * those are reported as errors, because silently working in memory would look like data loss.
 */
export async function openPersistence(options: OpenOptions): Promise<FallbackResult> {
  try {
    return { persistence: await openIndexedDbPersistence(options), degraded: null };
  } catch (e) {
    if (
      e instanceof StorageError &&
      (e.kind === "unavailable" || e.kind === "quota_exceeded" || e.kind === "unknown")
    ) {
      return { persistence: createMemoryPersistence(options), degraded: e.kind };
    }
    throw e;
  }
}

export type { Persistence };
