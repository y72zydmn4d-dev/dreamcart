import { z } from "zod";
import { cartLineSchema, lineKey, subtotalsByCurrency, type CartLine } from "@/modules/cart";
import { isMediaPath, userProductSchema, type UserProduct } from "@/modules/catalog";
import { buildScenarioSnapshot, virtualOrderSchema, type VirtualOrder } from "@/modules/orders";
import { settingsSchema, type Settings } from "@/modules/settings";
import { parseSafeUrl } from "@/modules/shared/domain/safe-url";

/**
 * Versioned JSON backup (docs/ARCHITECTURE.md §5). A backup file can come from anyone, so import is treated
 * as untrusted input: size cap, structure, schema, semantic integrity, URL re-validation. Nothing is ever
 * evaluated or rendered as markup: every string is data and React escapes it on render.
 */

export const BACKUP_FORMAT = "dreamcart-export" as const;
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 5_000_000;
export const BACKUP_NOTICE =
  "Bản sao lưu dữ liệu mô phỏng của DreamCart. Đây không phải biên nhận, hóa đơn hay chứng từ mua hàng thật.";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** Cart lines only: the checkout key is local to a device and is regenerated on restore. */
const backupCartSchema = z.strictObject({
  lines: z.array(cartLineSchema).max(200),
});

export const backupBundleSchema = z.strictObject({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().min(1),
  simulation: z.literal(true),
  notice: z.string().max(500),
  exportedAt: z.iso.datetime(),
  appVersion: z.string().min(1).max(40),
  data: z.strictObject({
    cart: backupCartSchema,
    orders: z.array(virtualOrderSchema).max(2000),
    userProducts: z.array(userProductSchema).max(500),
    settings: settingsSchema,
  }),
});
export type BackupBundle = z.infer<typeof backupBundleSchema>;

export interface BackupSource {
  readonly cartLines: readonly CartLine[];
  readonly orders: readonly VirtualOrder[];
  readonly userProducts: readonly UserProduct[];
  readonly settings: Settings;
  readonly exportedAtMs: number;
  readonly appVersion: string;
}

/** Build the export. Excludes secrets, browser identifiers, derived caches and the device-local checkout key. */
export function buildBackup(source: BackupSource): BackupBundle {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    simulation: true,
    notice: BACKUP_NOTICE,
    exportedAt: new Date(source.exportedAtMs).toISOString(),
    appVersion: source.appVersion,
    data: {
      cart: { lines: source.cartLines.map((l) => ({ ...l, unitPrice: { ...l.unitPrice } })) },
      orders: [...source.orders].sort(
        (a, b) => a.createdAtMs - b.createdAtMs || (a.id < b.id ? -1 : 1),
      ),
      userProducts: [...source.userProducts],
      settings: { ...source.settings, dismissedNotices: [...source.settings.dismissedNotices] },
    },
  };
}

export const serializeBackup = (bundle: BackupBundle): string => JSON.stringify(bundle, null, 2);

export interface ImportIssue {
  readonly path: string;
  readonly message: string;
}

export type BackupErrorKind =
  | "too_large"
  | "invalid_json"
  | "invalid_structure"
  | "unsupported_format"
  | "version_too_new"
  | "invalid_data";

export type ParseBackupResult =
  | { readonly ok: true; readonly bundle: BackupBundle; readonly normalizedUrls: number }
  | {
      readonly ok: false;
      readonly error: BackupErrorKind;
      readonly issues: readonly ImportIssue[];
    };

const MAX_ISSUES = 20;

function fail(error: BackupErrorKind, issues: ImportIssue[] = []): ParseBackupResult {
  return { ok: false, error, issues: issues.slice(0, MAX_ISSUES) };
}

/** Reject `__proto__`/`constructor`/`prototype` keys anywhere, and absurd nesting, before any schema runs. */
function structuralProblem(value: unknown, depth = 0): string | null {
  if (depth > 12) return "nesting too deep";
  if (Array.isArray(value)) {
    for (const item of value) {
      const problem = structuralProblem(item, depth + 1);
      if (problem) return problem;
    }
    return null;
  }
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) return `forbidden key "${key}"`;
      const problem = structuralProblem((value as Record<string, unknown>)[key], depth + 1);
      if (problem) return problem;
    }
  }
  return null;
}

const utf8Length = (text: string): number => new TextEncoder().encode(text).length;

/**
 * Semantic checks the schema cannot express. Returns human-readable problems; an empty list means the order is
 * internally consistent (totals add up, the simulation record matches a known preset, flags agree).
 */
export function orderIntegrityIssues(order: VirtualOrder): string[] {
  const issues: string[] = [];
  let sum = 0;
  const seen = new Set<string>();
  for (const [i, item] of order.items.entries()) {
    if (item.price.currency !== "VND") issues.push(`items[${i}] must be priced in VND`);
    const key = `${item.variantId}|${item.offerId}`;
    if (seen.has(key)) issues.push(`items[${i}] duplicates another line`);
    seen.add(key);
    sum += item.price.amountMinor * item.quantity;
    if ((item.priceStateAtPlacement === "STALE") !== item.freshnessWarningShown) {
      issues.push(`items[${i}] freshness flag disagrees with its price state`);
    }
    if (
      (item.priceStateAtPlacement === "USER_ENTERED") !==
      (item.price.provenanceType === "user_entered")
    ) {
      issues.push(`items[${i}] price state disagrees with its provenance`);
    }
    if (item.imageRef && !isMediaPath(item.imageRef.file))
      issues.push(`items[${i}].imageRef.file is not a repository path`);
  }
  if (!Number.isSafeInteger(sum) || sum !== order.total.amountMinor)
    issues.push("total does not equal the sum of its items");

  const expected = buildScenarioSnapshot(order.simulation.scenario.scenario, order.createdAtMs);
  if (
    order.simulation.scenario.scenarioVersion === expected.scenarioVersion &&
    JSON.stringify(order.simulation.scenario) !== JSON.stringify(expected)
  ) {
    issues.push("simulation record does not match its scenario preset");
  }
  if (order.simulation.scenario.scenario !== "fast" && order.simulation.manualStep !== 0) {
    issues.push("a timed scenario cannot have manual steps");
  }
  const cancelled = order.simulation.cancelledAtMs;
  if (cancelled !== null && cancelled < order.createdAtMs)
    issues.push("cancelled before it was created");
  return issues;
}

/**
 * Parse and validate backup text. On success the returned bundle is safe to hand to a repository: every order
 * is consistent and every link is a normalized http(s) URL (tracking parameters removed).
 */
export function parseBackup(text: string): ParseBackupResult {
  if (utf8Length(text) > MAX_BACKUP_BYTES) return fail("too_large");

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("invalid_json");
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw))
    return fail("invalid_structure");
  const problem = structuralProblem(raw);
  if (problem) return fail("invalid_structure", [{ path: "$", message: problem }]);

  const head = raw as Record<string, unknown>;
  if (head.format !== BACKUP_FORMAT) return fail("unsupported_format");
  if (typeof head.version !== "number" || !Number.isInteger(head.version) || head.version < 1) {
    return fail("invalid_structure", [
      { path: "version", message: "version must be a positive integer" },
    ]);
  }
  if (head.version > BACKUP_VERSION) return fail("version_too_new");
  // Older versions would be migrated here; version 1 is the first.

  const parsed = backupBundleSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      "invalid_data",
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }

  const issues: ImportIssue[] = [];
  const bundle = parsed.data;
  let normalizedUrls = 0;

  const ids = new Set<string>();
  const codes = new Set<string>();
  const keys = new Set<string>();
  bundle.data.orders.forEach((order, o) => {
    for (const [field, set, value] of [
      ["id", ids, order.id],
      ["code", codes, order.code],
      ["idempotencyKey", keys, order.idempotencyKey],
    ] as const) {
      if (set.has(value))
        issues.push({ path: `orders.${o}.${field}`, message: `duplicate ${field} in backup` });
      set.add(value);
    }
    for (const message of orderIntegrityIssues(order))
      issues.push({ path: `orders.${o}`, message });
    order.items.forEach((item, i) => {
      const url = parseSafeUrl(item.sourceUrl);
      if (!url.ok)
        issues.push({
          path: `orders.${o}.items.${i}.sourceUrl`,
          message: `unsafe link (${url.reason})`,
        });
      else {
        if (url.url !== item.sourceUrl) normalizedUrls++;
        item.sourceUrl = url.url;
      }
      if (item.price.evidenceUrl !== undefined) {
        const evidence = parseSafeUrl(item.price.evidenceUrl);
        if (!evidence.ok)
          issues.push({
            path: `orders.${o}.items.${i}.price.evidenceUrl`,
            message: `unsafe link (${evidence.reason})`,
          });
        else item.price.evidenceUrl = evidence.url;
      }
    });
  });

  const userProductIds = new Set<string>();
  bundle.data.userProducts.forEach((product, i) => {
    if (userProductIds.has(product.id))
      issues.push({ path: `userProducts.${i}.id`, message: "duplicate id in backup" });
    userProductIds.add(product.id);
    const url = parseSafeUrl(product.sourceUrl);
    if (!url.ok)
      issues.push({ path: `userProducts.${i}.sourceUrl`, message: `unsafe link (${url.reason})` });
    else product.sourceUrl = url.url;
  });

  const lineKeys = new Set<string>();
  bundle.data.cart.lines.forEach((line, i) => {
    const key = lineKey(line);
    if (lineKeys.has(key)) issues.push({ path: `cart.lines.${i}`, message: "duplicate cart line" });
    lineKeys.add(key);
  });
  try {
    subtotalsByCurrency({ lines: bundle.data.cart.lines, revision: 0, checkoutKey: "validation" });
  } catch {
    issues.push({ path: "cart.lines", message: "cart total overflows" });
  }

  if (issues.length > 0) return fail("invalid_data", issues);
  return { ok: true, bundle, normalizedUrls };
}

export type ConflictReason = "id" | "code" | "idempotency_key";

export interface MergePlan {
  readonly toAdd: readonly VirtualOrder[];
  /** Orders already present with identical content. */
  readonly skippedExisting: readonly string[];
  /** Orders that clash with a different existing order; they are skipped and reported, never overwritten. */
  readonly conflicts: readonly { readonly orderId: string; readonly reason: ConflictReason }[];
}

/**
 * Decide what a merge import does. Existing data always wins: an identical order is skipped, and an order that
 * shares an id, display code or idempotency key with a different existing order is reported as a conflict.
 */
export function planMerge(
  incoming: readonly VirtualOrder[],
  existing: readonly VirtualOrder[],
): MergePlan {
  const byId = new Map(existing.map((o) => [o.id, o]));
  const codes = new Set(existing.map((o) => o.code));
  const keys = new Set(existing.map((o) => o.idempotencyKey));
  const toAdd: VirtualOrder[] = [];
  const skippedExisting: string[] = [];
  const conflicts: { orderId: string; reason: ConflictReason }[] = [];
  for (const order of incoming) {
    const same = byId.get(order.id);
    if (same) {
      if (JSON.stringify(same) === JSON.stringify(order)) skippedExisting.push(order.id);
      else conflicts.push({ orderId: order.id, reason: "id" });
    } else if (codes.has(order.code)) conflicts.push({ orderId: order.id, reason: "code" });
    else if (keys.has(order.idempotencyKey))
      conflicts.push({ orderId: order.id, reason: "idempotency_key" });
    else toAdd.push(order);
  }
  return { toAdd, skippedExisting, conflicts };
}
