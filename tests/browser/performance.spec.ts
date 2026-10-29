import { expect, test } from "@playwright/test";

/**
 * Lab performance on a "mid-range phone" profile (390x844, 4x CPU slowdown, ~1.6 Mbit/s with 150 ms latency),
 * Chromium only (the CDP throttling it needs does not exist elsewhere). Targets are PRD G13: LCP <= 2.5 s,
 * CLS <= 0.1, INP <= 200 ms. CLS and the byte budgets are deterministic and enforced strictly. LCP and interaction
 * time depend on the machine running the test, so the enforced limits are looser than the targets (a regression
 * guard); the measured values are printed so the QA report can quote them.
 */
test.skip(({ browserName }) => browserName !== "chromium", "needs Chromium DevTools throttling");
test.use({ reducedMotion: "no-preference" });

const JS_BUDGET_BYTES = 300_000;
const CSS_BUDGET_BYTES = 20_000;
const LCP_GUARD_MS = 4000;
const CLS_TARGET = 0.1;
const INTERACTION_GUARD_MS = 500;

const PAGES = ["/", "/search", "/product/fx-aero", "/cart", "/checkout", "/orders", "/collection"];

for (const path of PAGES) {
  test(`${path}: layout stability, bytes and paint on a mid-range phone`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await page.addInitScript(() => {
      const m = { lcp: 0, cls: 0 };
      (window as unknown as { __perf: typeof m }).__perf = m;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) m.lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          value: number;
          hadRecentInput: boolean;
        }[]) {
          if (!entry.hadRecentInput) m.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    await page.goto(path, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    const result = await page.evaluate(() => {
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const bytes = (ext: string) =>
        resources
          .filter((r) => new URL(r.name).pathname.endsWith(ext))
          .reduce((s, r) => s + r.transferSize, 0);
      return {
        ...(window as unknown as { __perf: { lcp: number; cls: number } }).__perf,
        js: bytes(".js"),
        css: bytes(".css"),
        external: resources.filter((r) => new URL(r.name).origin !== location.origin).length,
      };
    });
    console.log(`PERF ${path} ${JSON.stringify(result)}`);

    expect(result.cls, "cumulative layout shift").toBeLessThanOrEqual(CLS_TARGET);
    expect(result.js, "JavaScript transferred").toBeLessThanOrEqual(JS_BUDGET_BYTES);
    expect(result.css, "CSS transferred").toBeLessThanOrEqual(CSS_BUDGET_BYTES);
    expect(result.external, "cross-origin requests").toBe(0);
    expect(result.lcp, "largest contentful paint").toBeLessThanOrEqual(LCP_GUARD_MS);
    await context.close();
  });
}

test("interactions stay responsive on a mid-range phone", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    const slowest = { ms: 0 };
    (window as unknown as { __slowest: typeof slowest }).__slowest = slowest;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) slowest.ms = Math.max(slowest.ms, entry.duration);
    }).observe({ type: "event", durationThreshold: 16, buffered: true } as PerformanceObserverInit);
  });
  await page.goto("/search");
  await expect(page.getByRole("button", { name: /Bộ lọc/ })).toBeVisible();
  await page.getByRole("button", { name: /Laptop/ }).click();
  await expect(page).toHaveURL(/category=laptop/);
  await page.getByRole("button", { name: /Bộ lọc/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: /Aero/ }).first().click();
  await page.getByRole("button", { name: /^13 inch/ }).click();
  await page.waitForTimeout(500);
  const slowest = await page.evaluate(
    () => (window as unknown as { __slowest: { ms: number } }).__slowest.ms,
  );
  console.log(`PERF interactions slowest event ${slowest} ms`);
  expect(slowest, "slowest interaction").toBeLessThanOrEqual(INTERACTION_GUARD_MS);
  await context.close();
});
