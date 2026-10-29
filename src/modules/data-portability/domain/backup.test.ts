import { describe, expect, it } from "vitest";
import type { Cart } from "@/modules/cart";
import { addLine, emptyCart } from "@/modules/cart";
import { formatOrderCode, placeOrder, type VirtualOrder } from "@/modules/orders";
import { DEFAULT_SETTINGS } from "@/modules/settings";
import {
  BACKUP_FORMAT,
  BACKUP_NOTICE,
  BACKUP_VERSION,
  buildBackup,
  MAX_BACKUP_BYTES,
  orderIntegrityIssues,
  parseBackup,
  planMerge,
  serializeBackup,
  type BackupBundle,
} from "./backup";

/** A deliberately loose view of the JSON document, so tests can corrupt any part of it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

const NOW = Date.parse("2026-11-30T00:00:00Z");

function makeOrder(n = 1, over: Partial<VirtualOrder> = {}): VirtualOrder {
  let cart: Cart = emptyCart(`checkout-key-${n}`);
  const added = addLine(
    cart,
    {
      variantId: "v1",
      offerId: "o1",
      quantity: 2,
      unitPrice: { amountMinor: 1_000_000, currency: "VND" },
    },
    { state: "OBSERVED", addable: true, reason: null },
    `checkout-key-${n}`,
  );
  if (!added.ok) throw new Error("setup");
  cart = added.cart;
  const result = placeOrder(
    {
      idempotencyKey: cart.checkoutKey,
      cart,
      resolveLine: () => ({
        productId: "p1",
        brand: "Brand",
        titleVi: "Sản phẩm",
        attributes: { color: "black" },
        merchantName: "Shop",
        sourceUrl: "https://shop.example/p1",
        price: {
          amountMinor: 1_000_000,
          currency: "VND",
          observedAt: "2026-11-29T00:00:00Z",
          provenanceType: "curator_observed",
          evidenceUrl: "https://shop.example/p1",
        },
        sourcePolicy: "snapshot_allowed",
        imageRef: null,
      }),
      nowMs: NOW + n * 1000,
      scenario: "quick",
      destination: "dream_apartment",
      payment: "dream_credits",
      acknowledged: true,
      catalogVersion: "cat-1",
      orderId: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
      code: formatOrderCode(Uint8Array.from({ length: 10 }, (_, i) => n * 13 + i)),
    },
    null,
  );
  if (!result.ok) throw new Error("setup");
  return { ...result.order, ...over };
}

const bundleOf = (orders: VirtualOrder[] = [makeOrder()]): BackupBundle =>
  buildBackup({
    cartLines: [
      {
        variantId: "v2",
        offerId: "o2",
        quantity: 1,
        unitPrice: { amountMinor: 500_000, currency: "VND" },
      },
    ],
    orders,
    userProducts: [],
    settings: DEFAULT_SETTINGS,
    exportedAtMs: NOW,
    appVersion: "0.1.0",
  });

/** Parse a mutated copy of a valid backup. */
function mutated(change: (b: Loose) => void, orders?: VirtualOrder[]) {
  const copy = JSON.parse(serializeBackup(bundleOf(orders)));
  change(copy);
  return parseBackup(JSON.stringify(copy));
}
const errorOf = (r: ReturnType<typeof parseBackup>) => (r.ok ? "ok" : r.error);

describe("export format", () => {
  it("is versioned, labeled as simulation, and carries a notice and timestamp", () => {
    const b = bundleOf();
    expect(b).toMatchObject({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      simulation: true,
      notice: BACKUP_NOTICE,
      exportedAt: "2026-11-30T00:00:00.000Z",
      appVersion: "0.1.0",
    });
    expect(Object.keys(b.data).sort()).toEqual(["cart", "orders", "settings", "userProducts"]);
  });
  it("orders are written oldest first so the file is stable", () => {
    const b = bundleOf([makeOrder(2), makeOrder(1)]);
    expect(b.data.orders.map((o) => o.createdAtMs)).toEqual([NOW + 1000, NOW + 2000]);
  });
  it("round-trips through serialize and parse unchanged", () => {
    const b = bundleOf([makeOrder(1), makeOrder(2)]);
    const parsed = parseBackup(serializeBackup(b));
    expect(parsed).toEqual({ ok: true, bundle: b, normalizedUrls: 0 });
  });
});

describe("hostile or malformed backups are rejected before they reach storage", () => {
  it("rejects oversized input", () => {
    expect(errorOf(parseBackup(" ".repeat(MAX_BACKUP_BYTES + 1)))).toBe("too_large");
  });
  it("counts bytes, not characters, for the size limit", () => {
    expect(errorOf(parseBackup("é".repeat(MAX_BACKUP_BYTES / 2 + 1)))).toBe("too_large");
  });
  it.each([
    ["not json", "{oops"],
    ["empty text", ""],
  ])("rejects %s", (_n, text) => {
    expect(errorOf(parseBackup(text))).toBe("invalid_json");
  });
  it.each([
    ["null", "null"],
    ["array", "[]"],
    ["string", '"x"'],
    ["number", "3"],
  ])("rejects a %s document", (_n, text) => {
    expect(errorOf(parseBackup(text))).toBe("invalid_structure");
  });
  it("rejects another file format and a version from the future", () => {
    expect(errorOf(mutated((b) => (b.format = "something-else")))).toBe("unsupported_format");
    expect(errorOf(mutated((b) => (b.version = BACKUP_VERSION + 1)))).toBe("version_too_new");
    expect(errorOf(mutated((b) => (b.version = 0)))).toBe("invalid_structure");
    expect(errorOf(mutated((b) => (b.version = 1.5)))).toBe("invalid_structure");
  });
  it("rejects prototype-pollution keys anywhere in the document", () => {
    const text = serializeBackup(bundleOf()).replace(
      '"appVersion"',
      '"__proto__": {"admin": true}, "appVersion"',
    );
    const result = parseBackup(text);
    expect(result).toMatchObject({ ok: false, error: "invalid_structure" });
    expect(({} as Record<string, unknown>).admin).toBeUndefined();
    const nested = mutated(
      (b) => (b.data.orders[0].items[0].attributes = JSON.parse('{"constructor": {"x": 1}}')),
    );
    expect(errorOf(nested)).toBe("invalid_structure");
  });
  it("rejects unknown fields instead of silently keeping them", () => {
    expect(errorOf(mutated((b) => (b.data.extra = 1)))).toBe("invalid_data");
    expect(errorOf(mutated((b) => (b.data.orders[0].trackingNumber = "VN1")))).toBe("invalid_data");
  });
  it.each([
    ["missing data", (b: Loose) => delete b.data],
    ["a negative price", (b: Loose) => (b.data.orders[0].items[0].price.amountMinor = -5)],
    ["a fractional price", (b: Loose) => (b.data.orders[0].items[0].price.amountMinor = 1.5)],
    ["an unknown currency", (b: Loose) => (b.data.orders[0].items[0].price.currency = "XXX")],
    ["quantity 0", (b: Loose) => (b.data.orders[0].items[0].quantity = 0)],
    ["quantity 100", (b: Loose) => (b.data.orders[0].items[0].quantity = 100)],
    ["a non-date timestamp", (b: Loose) => (b.exportedAt = "yesterday")],
    ["an invalid order code", (b: Loose) => (b.data.orders[0].code = "ORDER-1")],
    ["a non-virtual order", (b: Loose) => (b.data.orders[0].virtual = false)],
    [
      "an unknown order state",
      (b: Loose) => (b.data.orders[0].simulation.highWater = "TELEPORTED"),
    ],
    ["a real-looking destination", (b: Loose) => (b.data.orders[0].destination = "12 Real Street")],
    ["an overlong title", (b: Loose) => (b.data.orders[0].items[0].titleVi = "x".repeat(400))],
    ["a cart line with quantity 100", (b: Loose) => (b.data.cart.lines[0].quantity = 100)],
  ])("rejects %s", (_n, change) => {
    expect(errorOf(mutated(change))).toBe("invalid_data");
  });
  it("reports a bounded number of readable issues with paths", () => {
    const r = mutated((b) => (b.data.orders[0].items[0].quantity = 0));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.length).toBeGreaterThan(0);
      expect(r.issues.length).toBeLessThanOrEqual(20);
      expect(r.issues[0]!.path).toContain("quantity");
    }
  });
});

describe("unsafe URLs never reach an actionable link", () => {
  it.each([
    ["javascript:alert(1)"],
    ["data:text/html,<script>alert(1)</script>"],
    ["file:///etc/passwd"],
    ["vbscript:msgbox(1)"],
    ["https://user:pass@shop.example/x"],
    ["//shop.example/x"],
    ["not a url"],
    [""],
  ])("rejects an order source link %j", (url) => {
    expect(errorOf(mutated((b) => (b.data.orders[0].items[0].sourceUrl = url)))).toBe(
      "invalid_data",
    );
  });
  it("rejects an unsafe price-evidence link and an unsafe imported-product link", () => {
    expect(
      errorOf(
        mutated((b) => (b.data.orders[0].items[0].price.evidenceUrl = "javascript:alert(1)")),
      ),
    ).toBe("invalid_data");
    expect(
      errorOf(
        mutated((b) => {
          b.data.userProducts = [
            {
              id: "user-a",
              title: "t",
              sourceUrl: "data:text/html,x",
              attributes: {},
              price: null,
              unverified: true,
              createdAtMs: 1,
            },
          ];
        }),
      ),
    ).toBe("invalid_data");
  });
  it("normalizes a tracking-laden http(s) link and counts it", () => {
    const r = mutated(
      (b) =>
        (b.data.orders[0].items[0].sourceUrl =
          "https://shop.example/p1?utm_source=x&gclid=1&color=black"),
    );
    expect(r.ok && r.bundle.data.orders[0]!.items[0]!.sourceUrl).toBe(
      "https://shop.example/p1?color=black",
    );
    expect(r.ok && r.normalizedUrls).toBe(1);
  });
  it("treats markup in text as inert data: it is kept verbatim for the UI to escape, never interpreted", () => {
    const r = mutated(
      (b) => (b.data.orders[0].items[0].titleVi = '<img src=x onerror="alert(1)">'),
    );
    expect(r.ok && r.bundle.data.orders[0]!.items[0]!.titleVi).toBe(
      '<img src=x onerror="alert(1)">',
    );
  });
  it("rejects an image reference that is not a repository path", () => {
    for (const file of [
      "https://cdn.example.com/x.jpg",
      "../../etc/passwd",
      "javascript:alert(1)",
    ]) {
      const r = mutated(
        (b) =>
          (b.data.orders[0].items[0].imageRef = { mediaId: "m", file, rightsStatus: "CLEARED" }),
      );
      expect(errorOf(r)).toBe("invalid_data");
    }
  });
});

describe("referential and arithmetic integrity", () => {
  it("rejects a total that does not match its items", () => {
    expect(errorOf(mutated((b) => (b.data.orders[0].total.amountMinor = 1)))).toBe("invalid_data");
  });
  it("rejects duplicate ids, codes and idempotency keys inside one backup", () => {
    const a = makeOrder(1);
    const b = makeOrder(2);
    expect(errorOf(mutated(() => undefined, [a, { ...b, id: a.id }]))).toBe("invalid_data");
    expect(errorOf(mutated(() => undefined, [a, { ...b, code: a.code }]))).toBe("invalid_data");
    expect(errorOf(mutated(() => undefined, [a, { ...b, idempotencyKey: a.idempotencyKey }]))).toBe(
      "invalid_data",
    );
  });
  it("rejects a simulation record that does not match its preset or is internally contradictory", () => {
    expect(
      errorOf(
        mutated(
          (b) => (b.data.orders[0].simulation.scenario.milestoneOffsetsMs = [0, 1, 2, 3, 4, 5]),
        ),
      ),
    ).toBe("invalid_data");
    expect(errorOf(mutated((b) => (b.data.orders[0].simulation.manualStep = 3)))).toBe(
      "invalid_data",
    );
    expect(errorOf(mutated((b) => (b.data.orders[0].simulation.cancelledAtMs = 1)))).toBe(
      "invalid_data",
    );
  });
  it("rejects a duplicated cart line and a cart whose total overflows", () => {
    const line = {
      variantId: "v",
      offerId: "o",
      quantity: 1,
      unitPrice: { amountMinor: 5, currency: "VND" },
    };
    expect(errorOf(mutated((b) => (b.data.cart.lines = [line, line])))).toBe("invalid_data");
    const big = {
      variantId: "v",
      offerId: "o",
      quantity: 99,
      unitPrice: { amountMinor: Number.MAX_SAFE_INTEGER, currency: "VND" },
    };
    expect(errorOf(mutated((b) => (b.data.cart.lines = [big])))).toBe("invalid_data");
  });
  it("orderIntegrityIssues flags a freshness flag that disagrees with the price state", () => {
    const order = makeOrder();
    const bad = { ...order, items: [{ ...order.items[0]!, freshnessWarningShown: true }] };
    expect(orderIntegrityIssues(bad).join()).toContain("freshness");
    expect(orderIntegrityIssues(order)).toEqual([]);
  });
});

describe("merge planning (existing data always wins)", () => {
  const a = makeOrder(1);
  const b = makeOrder(2);
  it("adds new orders, skips identical ones and never overwrites", () => {
    expect(planMerge([a, b], [a])).toEqual({ toAdd: [b], skippedExisting: [a.id], conflicts: [] });
  });
  it("reports clashes on id, code and idempotency key", () => {
    expect(planMerge([{ ...a, destination: "dream_workspace" }], [a]).conflicts).toEqual([
      { orderId: a.id, reason: "id" },
    ]);
    expect(planMerge([{ ...b, code: a.code }], [a]).conflicts).toEqual([
      { orderId: b.id, reason: "code" },
    ]);
    expect(planMerge([{ ...b, idempotencyKey: a.idempotencyKey }], [a]).conflicts).toEqual([
      { orderId: b.id, reason: "idempotency_key" },
    ]);
  });
});
