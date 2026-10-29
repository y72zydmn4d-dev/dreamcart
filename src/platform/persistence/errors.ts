/**
 * Infrastructure failures. Expected refusals (a stale revision, a duplicate code) are results, not errors;
 * a `StorageError` means the storage layer itself could not do what was asked, and nothing was changed.
 */
export type StorageErrorKind =
  /** No IndexedDB, or the browser refuses to use it (some private modes, blocked site data). */
  | "unavailable"
  | "quota_exceeded"
  /** The transaction was aborted (interrupted write, closed connection). Nothing was written. */
  | "aborted"
  /** The database was created by a newer DreamCart than this one. Never downgraded or deleted. */
  | "schema_too_new"
  /** An upgrade step failed and was rolled back; existing data is untouched. */
  | "migration_failed"
  /** Another tab still holds an older version of the database open. */
  | "blocked"
  /** A stored record failed validation and could not be used. */
  | "corrupt_data"
  | "unknown";

export class StorageError extends Error {
  readonly kind: StorageErrorKind;
  constructor(kind: StorageErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageError";
    this.kind = kind;
  }
}

const errorName = (e: unknown): string =>
  e !== null && typeof e === "object" && "name" in e ? String((e as { name: unknown }).name) : "";

/** Map whatever the browser threw to one of our kinds. Already-classified errors pass through. */
export function classifyStorageError(e: unknown): StorageError {
  if (e instanceof StorageError) return e;
  const message = e instanceof Error ? e.message : String(e);
  switch (errorName(e)) {
    case "QuotaExceededError":
      return new StorageError("quota_exceeded", message, { cause: e });
    case "VersionError":
      return new StorageError("schema_too_new", message, { cause: e });
    case "AbortError":
    case "TransactionInactiveError":
      return new StorageError("aborted", message, { cause: e });
    case "SecurityError":
    case "NotAllowedError":
    case "InvalidStateError":
    case "UnknownError":
      return new StorageError("unavailable", message, { cause: e });
    default:
      return new StorageError("unknown", message, { cause: e });
  }
}

/** Constraint violations (a unique index) are expected in `placeOrder` and handled by the caller. */
export const isConstraintError = (e: unknown): boolean => errorName(e) === "ConstraintError";
