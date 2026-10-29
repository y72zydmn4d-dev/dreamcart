import type { BackupBundle, ConflictReason } from "../domain/backup";

/** Replacing everything is destructive: it is only expressible with an explicit confirmation. */
export type ImportMode =
  { readonly mode: "merge" } | { readonly mode: "replace"; readonly confirmed: true };

export interface ImportReport {
  readonly mode: "merge" | "replace";
  readonly addedOrders: number;
  readonly skippedExisting: number;
  readonly conflicts: readonly { readonly orderId: string; readonly reason: ConflictReason }[];
  /** Replace only: how many local orders were removed to make room. */
  readonly removedOrders: number;
}

export interface PortabilityRepository {
  /** One consistent read-only snapshot of everything the user owns. */
  exportAll(): Promise<BackupBundle>;
  /**
   * `bundle` must come from `parseBackup`. Merge adds orders that do not clash and leaves the cart, settings and
   * everything else alone. Replace swaps all user data in one transaction and invalidates other tabs' carts by
   * advancing the revision and issuing a new checkout key. Atomic: a failure changes nothing.
   */
  importBundle(
    bundle: BackupBundle,
    mode: ImportMode,
    context: { readonly nextCheckoutKey: string },
  ): Promise<ImportReport>;
}
