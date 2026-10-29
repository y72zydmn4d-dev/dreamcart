import { build } from "esbuild";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import type { Cart } from "@/modules/cart";
import type { Persistence, PersistenceDeps, StorageError } from "@/platform/persistence";

declare global {
  interface Window {
    /** The bundled harness (tests/browser/harness-entry.ts). */
    DC: typeof import("./harness-entry");
    p: Persistence;
    deps: PersistenceDeps;
    base: Cart;
  }
}

/**
 * Transaction guarantees cannot be proven with mocks, so these tests run the real IndexedDB adapter inside real
 * browser engines, with real tabs (pages of one browser context share a database, as tabs of a profile do).
 */
const ORIGIN = "https://dreamcart.test";
let bundle = "";

test.beforeAll(async () => {
  const result = await build({
    entryPoints: ["tests/browser/harness-entry.ts"],
    bundle: true,
    format: "iife",
    globalName: "DC",
    write: false,
    tsconfig: "tsconfig.json",
    target: "es2022",
  });
  bundle = result.outputFiles[0]!.text;
});

async function tab(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.route(`${ORIGIN}/**`, (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>harness</title>" }),
  );
  await page.goto(`${ORIGIN}/`);
  await page.addScriptTag({ content: bundle });
  return page;
}

/** Open the adapter in the page and keep it on `window.p`. */
const open = (page: Page) =>
  page.evaluate(async () => {
    const DC = window.DC;
    window.deps = { clock: DC.systemClock, ids: DC.browserIds };
    window.p = await DC.openIndexedDbPersistence(window.deps);
    return true;
  });

test("data survives a real page reload", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await tab(context);
  await open(page);
  await page.evaluate(async () => {
    const DC = window.DC;
    const { p, deps } = window;
    await DC.saveCartWith(p, deps.ids, DC.cartLine("v1", "o1", 3));
    await p.settings.update({ defaultScenario: "relaxed" });
  });
  await page.reload();
  await page.addScriptTag({ content: bundle });
  await open(page);
  const state = await page.evaluate(async () => {
    const { p } = window;
    return { cart: await p.cart.get(), settings: await p.settings.get() };
  });
  expect(state.cart.revision).toBe(1);
  expect(state.cart.lines[0]?.quantity).toBe(3);
  expect(state.settings.defaultScenario).toBe("relaxed");
  await context.close();
});

test("two real tabs checking out the same cart create exactly one order", async ({ browser }) => {
  const context = await browser.newContext();
  const [a, b] = [await tab(context), await tab(context)];
  await Promise.all([open(a), open(b)]);
  const key = await a.evaluate(async () => {
    const DC = window.DC;
    const { p, deps } = window;
    return (await DC.saveCartWith(p, deps.ids, DC.cartLine())).checkoutKey as string;
  });
  const place = (page: Page) =>
    page.evaluate(async (k) => {
      const DC = window.DC;
      const { p, deps } = window;
      const outcomes = await Promise.all(
        Array.from({ length: 5 }, () =>
          p.orders.placeOrder(DC.placeCommand(deps.clock, deps.ids, k)),
        ),
      );
      return outcomes.map((o) => (o.ok ? o.status : o.error));
    }, key);
  const results = (await Promise.all([place(a), place(b)])).flat();
  expect(results.filter((r) => r === "created")).toHaveLength(1);
  expect(results.filter((r) => r === "existing")).toHaveLength(9);
  for (const page of [a, b]) {
    expect(await page.evaluate(async () => (await window.p.orders.list()).length)).toBe(1);
  }
  await context.close();
});

test("a stale tab cannot overwrite a newer cart revision across real tabs", async ({ browser }) => {
  const context = await browser.newContext();
  const [a, b] = [await tab(context), await tab(context)];
  await Promise.all([open(a), open(b)]);
  await b.evaluate(async () => {
    window.base = await window.p.cart.get(); // tab B reads revision 0 and keeps it
  });
  await a.evaluate(async () => {
    const DC = window.DC;
    const { p, deps } = window;
    await DC.saveCartWith(p, deps.ids, DC.cartLine("from-a"));
  });
  const outcome = await b.evaluate(async () => {
    const DC = window.DC;
    const { p, deps, base } = window;
    const result = await p.cart.save({
      ...base,
      revision: 1,
      checkoutKey: deps.ids.uuid(),
      lines: [DC.cartLine("from-b")],
    });
    return {
      ok: result.ok,
      error: result.ok ? undefined : result.error,
      stored: (await p.cart.get()).lines.map((l: { variantId: string }) => l.variantId),
    };
  });
  expect(outcome).toEqual({ ok: false, error: "stale_revision", stored: ["from-a"] });
  await context.close();
});

test("a failed checkout transaction rolls back completely in a real engine", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await tab(context);
  await open(page);
  const result = await page.evaluate(async () => {
    const DC = window.DC;
    const { p, deps } = window;
    const first = await DC.saveCartWith(p, deps.ids, DC.cartLine());
    const placed = await p.orders.placeOrder(
      DC.placeCommand(deps.clock, deps.ids, first.checkoutKey),
    );
    const second = await DC.saveCartWith(p, deps.ids, DC.cartLine("v2", "o2"));
    const clash = await p.orders.placeOrder(
      DC.placeCommand(deps.clock, deps.ids, second.checkoutKey, {
        code: placed.ok ? placed.order.code : "missing",
      }),
    );
    return {
      clash: clash.ok ? "none" : clash.error,
      orders: (await p.orders.list()).length,
      cartUntouched: JSON.stringify(await p.cart.get()) === JSON.stringify(second),
    };
  });
  expect(result).toEqual({ clash: "code_collision", orders: 1, cartUntouched: true });
  await context.close();
});

test("an open tab steps aside for another tab's schema upgrade (no blocked upgrade)", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const [old, upgrader] = [await tab(context), await tab(context)];
  await open(old);
  const upgraded = await upgrader.evaluate(async () => {
    const DC = window.DC;
    const p = await DC.openIndexedDbPersistence({
      ...window.deps,
      clock: DC.systemClock,
      ids: DC.browserIds,
      version: 2,
      migrations: {
        ...DC.MIGRATIONS,
        2: (_db: IDBDatabase, tx: IDBTransaction) =>
          void tx.objectStore("orders").createIndex("destination", "destination"),
      },
    });
    return p.kind;
  });
  expect(upgraded).toBe("indexeddb");
  const afterwards = await old.evaluate(async () => {
    try {
      await window.p.cart.get();
      return "worked";
    } catch (e) {
      return (e as StorageError).kind;
    }
  });
  expect(afterwards).toBe("schema_too_new"); // the old code refuses a newer schema instead of corrupting it
  await context.close();
});

test("backup export restores into a clean browser profile, and invalid files cannot change it", async ({
  browser,
}) => {
  const source = await browser.newContext();
  const page = await tab(source);
  await open(page);
  const text = await page.evaluate(async () => {
    const DC = window.DC;
    const { p, deps } = window;
    const cart = await DC.saveCartWith(p, deps.ids, DC.cartLine("v1", "o1", 2));
    await p.orders.placeOrder(DC.placeCommand(deps.clock, deps.ids, cart.checkoutKey));
    await DC.saveCartWith(p, deps.ids, DC.cartLine("v5", "o5", 1));
    return DC.serializeBackup(await p.portability.exportAll());
  });
  await source.close();

  const clean = await browser.newContext(); // a different profile: no shared storage
  const fresh = await tab(clean);
  await open(fresh);
  const outcome = await fresh.evaluate(async (backup) => {
    const DC = window.DC;
    const { p, deps } = window;
    const bad = DC.parseBackup(backup.replace('"https://example.com/p1"', '"javascript:alert(1)"'));
    const before = JSON.stringify(await p.portability.exportAll());
    const good = DC.parseBackup(backup);
    if (!good.ok) throw new Error("fixture backup should parse");
    const report = await p.portability.importBundle(
      good.bundle,
      { mode: "replace", confirmed: true },
      { nextCheckoutKey: deps.ids.uuid() },
    );
    const after = await p.portability.exportAll();
    return {
      badRejected: !bad.ok && bad.error,
      emptyBefore: JSON.parse(before).data.orders.length === 0,
      report,
      orders: after.data.orders.length,
      cartLines: after.data.cart.lines.length,
    };
  }, text);
  expect(outcome.badRejected).toBe("invalid_data");
  expect(outcome.emptyBefore).toBe(true);
  expect(outcome.report).toMatchObject({ mode: "replace", addedOrders: 1, removedOrders: 0 });
  expect(outcome.orders).toBe(1);
  expect(outcome.cartLines).toBe(1);
  await clean.close();
});
