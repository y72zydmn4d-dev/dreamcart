import { expect, test, type Page } from "@playwright/test";
import { orderCodes, placeOneOrder } from "./support";

/**
 * Simulated delivery and My Collection with a controlled clock (Playwright `page.clock`). The synthetic order
 * states are a pure function of the stored record and the clock, so these tests move time instead of waiting.
 * Quick = 180 s with state starts at 0, 18, 45, 81, 135 and 180 s.
 */
test.use({ reducedMotion: "reduce" });

const START = new Date("2026-10-29T12:00:00Z");
const state = (page: Page) => page.getByTestId("order-state");
const PACKED = "Đã đóng gói (ảo)";
const IN_TRANSIT = "Đang vận chuyển ảo";
const DELIVERED = "Đã giao ảo";

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: START });
});

test.describe("Quick scenario", () => {
  test("progresses with time, delivers once, and fills My Collection exactly once", async ({
    page,
  }) => {
    const path = await placeOneOrder(page);
    await expect(state(page)).toHaveText("Đã xác nhận đơn mô phỏng");
    await expect(page.getByRole("list", { name: "Dòng thời gian giao hàng ảo" })).toBeVisible();
    await expect(
      page.getByText("không có hãng vận chuyển, mã vận đơn hay lô hàng thật"),
    ).toBeVisible();

    await page.clock.runFor(60_000);
    await expect(state(page)).toHaveText(PACKED);
    await page.clock.runFor(60_000);
    await expect(state(page)).toHaveText(IN_TRANSIT);
    // past PACKED the lifecycle continues: no cancel
    await expect(page.getByRole("button", { name: "Huỷ đơn mô phỏng" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Bước tiếp theo" })).toHaveCount(0);

    await page.clock.runFor(100_000);
    await expect(state(page)).toHaveText(DELIVERED);
    await expect(page.getByRole("heading", { name: "Đã giao ảo" })).toBeVisible();

    await page.reload();
    await expect(state(page)).toHaveText(DELIVERED);

    await page.goto("/collection");
    const cards = page.locator("main li").filter({ hasText: "Giao ảo từ đơn DC-V-" });
    await expect(cards).toHaveCount(1);
    await expect(page.getByText("Bản ghi mô phỏng", { exact: true })).toBeVisible();
    await page.goto(path);
    await page.goto("/collection");
    await expect(cards).toHaveCount(1);
  });

  test("progress never goes backwards when the clock is set back", async ({ page }) => {
    const path = await placeOneOrder(page);
    await page.clock.runFor(100_000);
    await expect(state(page)).toHaveText(IN_TRANSIT);
    // what was shown is stored; give the page a moment to persist it
    await page.reload();
    await expect(state(page)).toHaveText(IN_TRANSIT);

    await page.clock.setSystemTime(START);
    await page.reload();
    await expect(state(page)).toHaveText(IN_TRANSIT);
    await page.goto("/orders");
    await expect(page.getByText(IN_TRANSIT)).toBeVisible();
    await page.goto(path);
    await expect(state(page)).toHaveText(IN_TRANSIT);
  });

  test("a cancellation holds: later time and a reload never revive the order", async ({ page }) => {
    await placeOneOrder(page);
    await page.clock.runFor(50_000);
    await expect(state(page)).toHaveText(PACKED);
    await page.getByRole("button", { name: "Huỷ đơn mô phỏng" }).click();
    await page.getByRole("button", { name: "Xác nhận huỷ đơn" }).click();
    await expect(state(page)).toHaveText("Đã huỷ (mô phỏng)");
    await expect(page.getByText("Đơn đã huỷ khi đang ở bước: Đã đóng gói (ảo)")).toBeVisible();

    await page.clock.runFor(400_000);
    await page.reload();
    await expect(state(page)).toHaveText("Đã huỷ (mô phỏng)");
    await page.goto("/collection");
    await expect(page.getByRole("heading", { name: "Bộ sưu tập đang trống" })).toBeVisible();
  });

  test("a delivery is announced once inside the app and then retired", async ({ page }) => {
    await placeOneOrder(page);
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Giỏ hàng đang trống" })).toBeVisible();
    await expect(page.getByText(/đã được giao ảo/)).toHaveCount(0);

    await page.clock.runFor(200_000);
    const notice = page.getByRole("status").filter({ hasText: /đã được giao ảo/ });
    await expect(notice).toBeVisible();
    await notice.getByRole("link", { name: "Xem Bộ sưu tập" }).click();
    await expect(page).toHaveURL(/\/collection$/);
    await expect(page.locator("main li").filter({ hasText: "Giao ảo từ đơn" })).toHaveCount(1);
    // seeing the collection retires the notice
    await expect(notice).toBeHidden();
    await page.goto("/cart");
    await expect(page.getByText(/đã được giao ảo/)).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(/đã được giao ảo/)).toHaveCount(0);
  });

  test("the collection is rendered from stored orders: no API call and nothing leaves the site", async ({
    page,
  }) => {
    await placeOneOrder(page);
    await page.clock.runFor(200_000);
    await expect(state(page)).toHaveText(DELIVERED);
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    await page.goto("/collection");
    await expect(page.locator("main li").filter({ hasText: "Giao ảo từ đơn" })).toHaveCount(1);
    const origin = new URL(page.url()).origin;
    expect(requests.filter((u) => !u.startsWith(origin))).toEqual([]);
    expect(requests.filter((u) => new URL(u).pathname.startsWith("/api"))).toEqual([]);
  });
});

test.describe("Fast scenario", () => {
  test("moves one step per press, never by itself, and delivers at the end", async ({ page }) => {
    await placeOneOrder(page, /Nhanh/);
    await expect(state(page)).toHaveText("Đã xác nhận đơn mô phỏng");
    await expect(page.getByText(/dự kiến/)).toHaveCount(0);

    // time passing changes nothing in the manual scenario
    await page.clock.runFor(3_600_000);
    await expect(state(page)).toHaveText("Đã xác nhận đơn mô phỏng");

    const next = page.getByRole("button", { name: "Bước tiếp theo" });
    for (const label of ["Đang chuẩn bị (ảo)", PACKED, IN_TRANSIT, "Đang giao ảo", DELIVERED]) {
      await next.click();
      await expect(state(page)).toHaveText(label);
      await expect(page.getByTestId("order-status")).toContainText(`Đơn đã chuyển sang: ${label}`);
    }
    await expect(next).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Đã giao ảo" })).toBeVisible();

    await page.reload();
    await expect(state(page)).toHaveText(DELIVERED);
    await page.goto("/collection");
    await expect(page.locator("main li").filter({ hasText: "Giao ảo từ đơn" })).toHaveCount(1);
  });

  test("can be cancelled while confirmed, preparing or packed, and not after", async ({ page }) => {
    await placeOneOrder(page, /Nhanh/);
    const next = page.getByRole("button", { name: "Bước tiếp theo" });
    await next.click();
    await next.click();
    await expect(state(page)).toHaveText(PACKED);
    await expect(page.getByRole("button", { name: "Huỷ đơn mô phỏng" })).toBeVisible();
    await next.click();
    await expect(state(page)).toHaveText(IN_TRANSIT);
    await expect(page.getByRole("button", { name: "Huỷ đơn mô phỏng" })).toHaveCount(0);
  });
});

test("orders placed in different scenarios keep their own pace", async ({ page }) => {
  await placeOneOrder(page, /Nhanh/);
  await placeOneOrder(page, /Vừa/);
  await page.clock.runFor(200_000);
  await page.goto("/orders");
  await expect(page.locator("main a p.font-mono")).toHaveCount(2);
  await expect(page.getByText(DELIVERED, { exact: true })).toHaveCount(1);
  await expect(page.getByText("Đã xác nhận đơn mô phỏng", { exact: true })).toHaveCount(1);
  expect(await orderCodes(page)).toHaveLength(2);
});
