import { describe, expect, it } from "vitest";
import { parseBackup, serializeBackup } from "@/modules/data-portability";
import { computeOrderState, type VirtualOrder } from "@/modules/orders";
import type { Persistence } from "./types";
import {
  cartLine,
  counterIds,
  placeCommand,
  placeOne,
  saveCartWith,
  testClock,
  type TestClock,
} from "./test-support";

export interface ContractContext {
  readonly p: Persistence;
  readonly clock: TestClock;
  readonly ids: ReturnType<typeof counterIds>;
  /** A second, empty persistence of the same kind (a clean browser). */
  readonly fresh: () => Promise<Persistence>;
}

/**
 * Behavior every persistence adapter must provide (the "contract suite" ARCHITECTURE §3 deferred until a second
 * adapter existed). It runs against the IndexedDB adapter and the in-memory adapter.
 */
export function describePersistenceContract(
  name: string,
  setup: () => Promise<ContractContext>,
): void {
  describe(`${name}: persistence contract`, () => {
    describe("cart", () => {
      it("starts empty at revision 0 with a checkout key", async () => {
        const { p } = await setup();
        const cart = await p.cart.get();
        expect(cart).toMatchObject({ lines: [], revision: 0 });
        expect(cart.checkoutKey.length).toBeGreaterThanOrEqual(8);
      });

      it("creates, reads, updates and removes through the repository", async () => {
        const { p, ids } = await setup();
        const saved = await saveCartWith(p, ids, cartLine("v1", "o1", 2));
        expect(saved).toMatchObject({ revision: 1 });
        expect(await p.cart.get()).toEqual(saved);
        const more = await saveCartWith(p, ids, cartLine("v2", "o2", 1));
        expect(more.revision).toBe(2);
        expect(more.lines.map((l) => l.variantId)).toEqual(["v1", "v2"]);
      });

      it("rejects a save built on an outdated read (stale revision) and shows what is stored", async () => {
        const { p, ids } = await setup();
        const base = await p.cart.get();
        const a = await saveCartWith(p, ids, cartLine("v1"));
        const stale = await p.cart.save({
          ...base,
          lines: [cartLine("v9")],
          revision: 1,
          checkoutKey: ids.uuid(),
        });
        expect(stale).toMatchObject({ ok: false, error: "stale_revision" });
        if (!stale.ok) expect(stale.current).toEqual(a);
        expect(await p.cart.get()).toEqual(a); // the newer state was not overwritten
      });

      it("rejects a save that skips a revision", async () => {
        const { p, ids } = await setup();
        const base = await p.cart.get();
        const skipped = await p.cart.save({ ...base, revision: 2, checkoutKey: ids.uuid() });
        expect(skipped).toMatchObject({ ok: false, error: "stale_revision" });
      });

      it("returns copies: editing a returned cart does not change storage", async () => {
        const { p, ids } = await setup();
        const saved = await saveCartWith(p, ids, cartLine());
        (saved.lines[0] as { quantity: number }).quantity = 99;
        expect((await p.cart.get()).lines[0]!.quantity).toBe(1);
      });
    });

    describe("checkout (placeOrder)", () => {
      it("creates one immutable virtual order, clears the cart and rotates the key", async () => {
        const { p, clock, ids } = await setup();
        const cart = await saveCartWith(p, ids, cartLine("v1", "o1", 2));
        const outcome = await p.orders.placeOrder(placeCommand(clock, ids, cart.checkoutKey));
        if (!outcome.ok) throw new Error(outcome.error);
        expect(outcome.status).toBe("created");
        expect(outcome.order).toMatchObject({
          virtual: true,
          idempotencyKey: cart.checkoutKey,
          total: { amountMinor: 2_000_000 },
        });
        const after = await p.cart.get();
        expect(after.lines).toEqual([]);
        expect(after.revision).toBe(cart.revision + 1);
        expect(after.checkoutKey).not.toBe(cart.checkoutKey);
        expect(await p.orders.get(outcome.order.id)).toEqual(outcome.order);
      });

      it("replaying a successful key returns the existing order and creates nothing", async () => {
        const { p, clock, ids } = await setup();
        const cart = await saveCartWith(p, ids, cartLine());
        const first = await p.orders.placeOrder(placeCommand(clock, ids, cart.checkoutKey));
        const replay = await p.orders.placeOrder(placeCommand(clock, ids, cart.checkoutKey));
        if (!first.ok || !replay.ok) throw new Error("expected success");
        expect(replay.status).toBe("existing");
        expect(replay.order).toEqual(first.order);
        expect(await p.orders.list()).toHaveLength(1);
      });

      it("a burst of identical requests creates exactly one order", async () => {
        const { p, clock, ids } = await setup();
        const cart = await saveCartWith(p, ids, cartLine());
        const results = await Promise.all(
          Array.from({ length: 8 }, () =>
            p.orders.placeOrder(placeCommand(clock, ids, cart.checkoutKey)),
          ),
        );
        const statuses = results.map((r) => (r.ok ? r.status : r.error));
        expect(statuses.filter((s) => s === "created")).toHaveLength(1);
        expect(statuses.filter((s) => s === "existing")).toHaveLength(7);
        expect(new Set(results.map((r) => (r.ok ? r.order.id : "")).filter(Boolean)).size).toBe(1);
        expect(await p.orders.list()).toHaveLength(1);
      });

      it("rejects a stale cart (the key is no longer the cart's) without touching anything", async () => {
        const { p, clock, ids } = await setup();
        const old = await saveCartWith(p, ids, cartLine());
        await saveCartWith(p, ids, cartLine("v2", "o2")); // the cart changed: new revision, new key
        const result = await p.orders.placeOrder(placeCommand(clock, ids, old.checkoutKey));
        expect(result).toMatchObject({ ok: false, error: "stale_cart" });
        expect(await p.orders.list()).toEqual([]);
        expect((await p.cart.get()).lines).toHaveLength(2);
      });

      it.each([
        ["an unacknowledged simulation", { acknowledged: false }, "not_acknowledged"],
        [
          "a changed price",
          {
            resolveLine: () => ({
              ...placeCommand(testClock(), counterIds(), "k").resolveLine("v1", "o1")!,
              price: {
                amountMinor: 900_000,
                currency: "VND" as const,
                observedAt: "2026-11-29T00:00:00Z",
                provenanceType: "curator_observed" as const,
              },
            }),
          },
          "price_changed",
        ],
        ["a line the catalog no longer has", { resolveLine: () => null }, "line_unresolved"],
      ])("refuses %s and leaves cart and orders unchanged", async (_name, over, error) => {
        const { p, clock, ids } = await setup();
        const cart = await saveCartWith(p, ids, cartLine());
        const result = await p.orders.placeOrder(placeCommand(clock, ids, cart.checkoutKey, over));
        expect(result).toMatchObject({ ok: false, error });
        expect(await p.orders.list()).toEqual([]);
        expect(await p.cart.get()).toEqual(cart);
      });

      it("a display-code collision rolls back completely and can be retried with a new code", async () => {
        const { p, clock, ids } = await setup();
        const { order } = await placeOne(p, { clock, ids });
        const cart = await saveCartWith(p, ids, cartLine("v7", "o7"));
        const clash = await p.orders.placeOrder(
          placeCommand(clock, ids, cart.checkoutKey, { code: order.code }),
        );
        expect(clash).toEqual({ ok: false, error: "code_collision" });
        expect(await p.orders.list()).toHaveLength(1); // no half-written order
        expect(await p.cart.get()).toEqual(cart); // cart not cleared
        const retry = await p.orders.placeOrder(placeCommand(clock, ids, cart.checkoutKey));
        expect(retry).toMatchObject({ ok: true, status: "created" });
      });

      it("keeps the snapshot as it was at placement, whatever happens to the source data later", async () => {
        const { p, clock, ids } = await setup();
        const { order } = await placeOne(p, { clock, ids });
        clock.advance(10 * 24 * 3600 * 1000);
        const stored = (await p.orders.get(order.id))!;
        expect(stored.items).toEqual(order.items);
        expect(stored.total).toEqual(order.total);
        expect(stored.catalogVersion).toBe("cat-test");
      });
    });

    describe("orders and simulation", () => {
      it("lists newest first and returns copies", async () => {
        const { p, clock, ids } = await setup();
        const first = await placeOne(p, { clock, ids });
        clock.advance(1000);
        const second = await placeOne(p, { clock, ids });
        expect((await p.orders.list()).map((o) => o.id)).toEqual([second.order.id, first.order.id]);
        const list = await p.orders.list();
        (list[0] as { code: string }).code = "tampered";
        expect((await p.orders.list())[0]!.code).not.toBe("tampered");
      });

      it("observing raises the stored high-water mark so a backward clock cannot regress it", async () => {
        const { p, clock, ids } = await setup();
        const { order } = await placeOne(p, { clock, ids });
        clock.set(order.createdAtMs + 100_000); // Quick: IN_TRANSIT
        const seen = (await p.orders.observe(order.id))!;
        expect(seen.state).toBe("IN_TRANSIT");
        clock.set(order.createdAtMs + 1_000); // clock moves back
        const again = (await p.orders.observe(order.id))!;
        expect(again.state).toBe("IN_TRANSIT");
        expect(again.order.simulation.highWater).toBe("IN_TRANSIT");
        expect(
          computeOrderState((await p.orders.get(order.id))!.simulation, order.createdAtMs),
        ).toBe("IN_TRANSIT");
      });

      it("recordHighWater only ever raises", async () => {
        const { p, clock, ids } = await setup();
        const { order } = await placeOne(p, { clock, ids });
        await p.orders.recordHighWater(order.id, "PACKED");
        await p.orders.recordHighWater(order.id, "PREPARING");
        expect((await p.orders.get(order.id))!.simulation.highWater).toBe("PACKED");
      });

      it("cancels through PACKED, decided by the clock inside the operation", async () => {
        const { p, clock, ids } = await setup();
        const { order } = await placeOne(p, { clock, ids });
        clock.set(order.createdAtMs + 80_999);
        const ok = await p.orders.cancel(order.id);
        expect(ok).toMatchObject({ ok: true, state: "CANCELLED" });
        expect(await p.orders.cancel(order.id)).toMatchObject({
          ok: false,
          error: "already_cancelled",
        });
      });

      it("refuses to cancel once the order is in transit, and the refusal changes nothing", async () => {
        const { p, clock, ids } = await setup();
        const { order } = await placeOne(p, { clock, ids });
        clock.set(order.createdAtMs + 81_000);
        expect(await p.orders.cancel(order.id)).toMatchObject({
          ok: false,
          error: "not_cancellable",
          state: "IN_TRANSIT",
        });
        expect((await p.orders.get(order.id))!.simulation.cancelledAtMs).toBeNull();
      });

      it("advances the manual (Fast) scenario one step at a time and refuses timed ones", async () => {
        const { p, clock, ids } = await setup();
        const fast = (await placeOne(p, { clock, ids }, { scenario: "fast" })).order;
        const r1 = await p.orders.advance(fast.id);
        expect(r1).toMatchObject({ ok: true, state: "PREPARING" });
        const r2 = await p.orders.advance(fast.id);
        expect(r2).toMatchObject({ ok: true, state: "PACKED" });
        const quick = (await placeOne(p, { clock, ids })).order;
        expect(await p.orders.advance(quick.id)).toMatchObject({ ok: false, error: "not_manual" });
        expect(await p.orders.advance("missing")).toEqual({ ok: false, error: "not_found" });
      });

      it("observeAll evaluates every order", async () => {
        const { p, clock, ids } = await setup();
        await placeOne(p, { clock, ids });
        clock.advance(1000);
        await placeOne(p, { clock, ids });
        clock.advance(200_000);
        const all = await p.orders.observeAll();
        expect(all.map((o) => o.state)).toEqual(["VIRTUALLY_DELIVERED", "VIRTUALLY_DELIVERED"]);
      });

      it("deletes one order or all of them, explicitly", async () => {
        const { p, clock, ids } = await setup();
        const a = await placeOne(p, { clock, ids });
        await placeOne(p, { clock, ids });
        expect(await p.orders.delete(a.order.id)).toBe(true);
        expect(await p.orders.delete(a.order.id)).toBe(false);
        expect(await p.orders.list()).toHaveLength(1);
        await p.orders.deleteAll();
        expect(await p.orders.list()).toEqual([]);
      });
    });

    describe("settings and imported products", () => {
      it("returns defaults, then persists validated updates", async () => {
        const { p } = await setup();
        expect(await p.settings.get()).toEqual({ defaultScenario: "quick", dismissedNotices: [] });
        const next = await p.settings.update({
          defaultScenario: "relaxed",
          dismissedNotices: ["export-hint"],
        });
        expect(next).toEqual({ defaultScenario: "relaxed", dismissedNotices: ["export-hint"] });
        expect(await p.settings.get()).toEqual(next);
        await expect(
          p.settings.update({ defaultScenario: "overnight" as never }),
        ).rejects.toThrow();
        expect(await p.settings.get()).toEqual(next);
      });

      it("stores user-entered products as unverified records", async () => {
        const { p, clock } = await setup();
        const product = {
          id: "user-abc",
          title: "Sản phẩm nhập tay",
          sourceUrl: "https://shop.example/x",
          attributes: {},
          price: null,
          unverified: true as const,
          createdAtMs: clock.nowMs(),
        };
        await p.userProducts.put(product);
        expect(await p.userProducts.list()).toEqual([product]);
        await expect(
          p.userProducts.put({ ...product, unverified: false as never }),
        ).rejects.toThrow();
        expect(await p.userProducts.delete("user-abc")).toBe(true);
        expect(await p.userProducts.list()).toEqual([]);
      });
    });

    describe("backup, restore and deletion", () => {
      async function populated(ctx: ContractContext) {
        const { p, clock, ids } = ctx;
        await placeOne(p, { clock, ids });
        clock.advance(5000);
        const second = await placeOne(p, { clock, ids });
        await saveCartWith(p, ids, cartLine("v5", "o5", 3));
        await p.settings.update({ defaultScenario: "relaxed" });
        await p.userProducts.put({
          id: "user-x",
          title: "Tự nhập",
          sourceUrl: "https://shop.example/x?utm_source=a",
          attributes: { color: "black" },
          price: { amountMinor: 5, currency: "VND" },
          unverified: true,
          createdAtMs: clock.nowMs(),
        });
        return second.order;
      }

      it("round-trips: export, parse, import into a clean browser restores everything", async () => {
        const ctx = await setup();
        await populated(ctx);
        const exported = await ctx.p.portability.exportAll();
        const parsed = parseBackup(serializeBackup(exported));
        if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
        const clean = await ctx.fresh();
        const report = await clean.portability.importBundle(
          parsed.bundle,
          { mode: "replace", confirmed: true },
          { nextCheckoutKey: "restored-key-1" },
        );
        expect(report).toMatchObject({ mode: "replace", addedOrders: 2, removedOrders: 0 });
        expect(await clean.orders.list()).toEqual(await ctx.p.orders.list());
        expect((await clean.cart.get()).lines).toEqual((await ctx.p.cart.get()).lines);
        expect((await clean.cart.get()).checkoutKey).toBe("restored-key-1");
        expect(await clean.settings.get()).toEqual(await ctx.p.settings.get());
        expect((await clean.userProducts.list()).map((u) => u.sourceUrl)).toEqual([
          "https://shop.example/x",
        ]); // tracking param stripped
        // and the restored data exports to the same thing (modulo the export timestamp)
        const again = await clean.portability.exportAll();
        expect({ ...again, exportedAt: "" }).toEqual({ ...parsed.bundle, exportedAt: "" });
      });

      it("never exports the device-local checkout key or anything outside the documented data", async () => {
        const ctx = await setup();
        await populated(ctx);
        const text = serializeBackup(await ctx.p.portability.exportAll());
        const cart = await ctx.p.cart.get();
        expect(text).not.toContain(cart.checkoutKey);
        expect(JSON.parse(text)).toMatchObject({
          format: "dreamcart-export",
          version: 1,
          simulation: true,
        });
        expect(Object.keys(JSON.parse(text).data).sort()).toEqual([
          "cart",
          "orders",
          "settings",
          "userProducts",
        ]);
      });

      it("merge adds only what is new, skips identical orders and reports conflicts without overwriting", async () => {
        const ctx = await setup();
        const second = await populated(ctx);
        const bundle = await ctx.p.portability.exportAll();
        const same = await ctx.p.portability.importBundle(
          bundle,
          { mode: "merge" },
          { nextCheckoutKey: "key-for-tests-1" },
        );
        expect(same).toMatchObject({ addedOrders: 0, skippedExisting: 2, conflicts: [] });
        // a different order under an existing id is a conflict and is left alone
        const tampered = {
          ...bundle,
          data: {
            ...bundle.data,
            orders: [{ ...second, destination: "dream_workspace" as const }],
          },
        };
        const clash = await ctx.p.portability.importBundle(
          tampered,
          { mode: "merge" },
          { nextCheckoutKey: "key-for-tests-1" },
        );
        expect(clash).toMatchObject({
          addedOrders: 0,
          conflicts: [{ orderId: second.id, reason: "id" }],
        });
        expect((await ctx.p.orders.get(second.id))!.destination).toBe("dream_apartment");
        // merge into a clean browser adds both and leaves its own cart and settings alone
        const clean = await ctx.fresh();
        const added = await clean.portability.importBundle(
          bundle,
          { mode: "merge" },
          { nextCheckoutKey: "key-for-tests-1" },
        );
        expect(added).toMatchObject({ addedOrders: 2 });
        expect((await clean.cart.get()).lines).toEqual([]);
        expect(await clean.settings.get()).toEqual({
          defaultScenario: "quick",
          dismissedNotices: [],
        });
      });

      it("replace needs explicit confirmation, swaps everything, and invalidates other tabs' carts", async () => {
        const ctx = await setup();
        await populated(ctx);
        const bundle = await ctx.p.portability.exportAll();
        await expect(
          ctx.p.portability.importBundle(bundle, { mode: "replace" } as never, {
            nextCheckoutKey: "key-for-tests-1",
          }),
        ).rejects.toThrow(/confirmation/);
        const before = await ctx.p.cart.get();
        const report = await ctx.p.portability.importBundle(
          bundle,
          { mode: "replace", confirmed: true },
          { nextCheckoutKey: "post-restore-key" },
        );
        expect(report).toMatchObject({ mode: "replace", removedOrders: 2, addedOrders: 2 });
        const after = await ctx.p.cart.get();
        expect(after.revision).toBe(before.revision + 1);
        expect(after.checkoutKey).toBe("post-restore-key");
        const stale = await ctx.p.cart.save({
          ...before,
          revision: before.revision + 1,
          checkoutKey: "stale-key-0001",
        });
        expect(stale).toMatchObject({ ok: false, error: "stale_revision" });
      });

      it("deleteAllData removes everything the user owns and nothing else breaks", async () => {
        const ctx = await setup();
        await populated(ctx);
        await ctx.p.deleteAllData();
        expect(await ctx.p.orders.list()).toEqual([]);
        expect((await ctx.p.cart.get()).lines).toEqual([]);
        expect(await ctx.p.userProducts.list()).toEqual([]);
        expect(await ctx.p.settings.get()).toEqual({
          defaultScenario: "quick",
          dismissedNotices: [],
        });
        const exported = await ctx.p.portability.exportAll();
        expect(exported.data).toMatchObject({ orders: [], userProducts: [], cart: { lines: [] } });
        // and it is usable again afterwards
        await placeOne(ctx.p, { clock: ctx.clock, ids: ctx.ids });
        expect(await ctx.p.orders.list()).toHaveLength(1);
      });
    });
  });
}

export type { VirtualOrder };
