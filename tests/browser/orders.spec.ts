import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * Virtual checkout, orders and data controls in a real browser, on the synthetic fixture catalog. Every test gets a
 * fresh browser context, so storage starts empty. Nothing here may contact another origin.
 */
import {
  CONFIRM,
  acknowledge,
  addAeroToCart,
  openCheckout,
  orderCodes,
  placeOneOrder,
} from "./support";

const WATERMARK = "MÔ PHỎNG · KHÔNG PHẢI HOÁ ĐƠN";

test.use({ reducedMotion: "reduce" });

const axeViolations = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id} (${v.nodes.length})`);

test.describe("checkout", () => {
  test("an order needs the acknowledgement, is created once, and is labeled simulated everywhere", async ({
    page,
  }) => {
    const origins = new Set<string>();
    page.on("request", (r) => {
      const url = new URL(r.url());
      if (url.protocol.startsWith("http")) origins.add(url.origin);
    });

    await addAeroToCart(page);
    await page.goto("/cart");
    await page.getByRole("link", { name: "Thanh toán mô phỏng" }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByText(WATERMARK)).toBeVisible();
    await expect(page.getByText("Dream Credits (ảo)")).toBeVisible();
    await expect(page.getByText(/không lưu địa chỉ thật/)).toBeVisible();

    const confirm = page.getByRole("button", { name: CONFIRM });
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page.getByRole("alert").filter({ hasText: "ô xác nhận" })).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);

    await page.getByRole("radio", { name: /Dream Workspace/ }).check();
    await acknowledge(page).check();
    await confirm.click();
    await page.waitForURL(/\/orders\/[^/?]+\?placed=1$/);

    await expect(page.getByRole("heading", { name: "Đã tạo đơn mô phỏng" })).toBeVisible();
    await expect(page.getByText(WATERMARK)).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /^DC-V-[0-9A-Z]{10}$/ }),
    ).toBeVisible();
    await expect(page.getByText("Dream Workspace · văn phòng ảo")).toBeVisible();
    await expect(page.getByTestId("order-state")).toHaveText("Đã xác nhận đơn mô phỏng");
    await expect(page.getByText("Hình minh hoạ, không phải ảnh sản phẩm thật")).toBeVisible();

    // the cart was emptied by the order, and the order survives a reload
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Giỏ hàng đang trống" })).toBeVisible();
    await page.goBack();
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: /^DC-V-/ })).toBeVisible();

    // nothing at all left this site
    const base = new URL(page.url()).origin;
    expect([...origins].filter((o) => o !== base)).toEqual([]);
  });

  test("a double click and a second tab produce exactly one order", async ({ context, page }) => {
    await addAeroToCart(page);
    await openCheckout(page);
    const other = await context.newPage();
    await openCheckout(other);
    await acknowledge(page).check();
    await acknowledge(other).check();

    // Whichever tab wins the race, the other tab's button disappears (the order empties the cart there). That is the
    // outcome under test, so a click on a vanished button is not an error.
    const press = (tab: Page, double: boolean) => {
      const button = tab.getByRole("button", { name: CONFIRM });
      return (double ? button.dblclick({ timeout: 5000 }) : button.click({ timeout: 5000 })).catch(
        () => undefined,
      );
    };
    await Promise.all([press(page, true), press(other, false)]);
    await Promise.race([page.waitForURL(/\/orders\//), other.waitForURL(/\/orders\//)]);
    await page.waitForTimeout(500);

    const codes = await orderCodes(page);
    expect(codes).toHaveLength(1);
    // the other tab either followed to the same order or was told the cart changed; it never made a second one
    expect(await orderCodes(other)).toEqual(codes);
  });

  test("a changed price stops checkout and sends the user back to accept it", async ({ page }) => {
    await addAeroToCart(page);
    await page.goto("/cart");
    await expect(page.getByRole("region", { name: /Nguồn:/ })).toBeVisible();
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open("dreamcart");
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction("cart", "readwrite");
            const store = tx.objectStore("cart");
            const get = store.get("current");
            get.onsuccess = () => {
              const cart = get.result;
              cart.lines[0].unitPrice.amountMinor += 1_000_000;
              store.put(cart, "current");
            };
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await page.goto("/checkout");
    const alert = page.getByRole("alert").filter({ hasText: "Giỏ hàng chưa thể tạo đơn" });
    await expect(alert).toBeVisible();
    await expect(page.getByRole("button", { name: CONFIRM })).toHaveCount(0);
    await alert.getByRole("link", { name: "Quay lại giỏ hàng" }).click();
    await page.getByRole("button", { name: "Chấp nhận giá mới", exact: true }).click();
    await expect(page.getByTestId("cart-status")).toContainText("Đã cập nhật giá");
    await page.getByRole("link", { name: "Thanh toán mô phỏng" }).click();
    await acknowledge(page).check();
    await page.getByRole("button", { name: CONFIRM }).click();
    await page.waitForURL(/\/orders\//);
  });

  test("an empty cart has nothing to check out", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Giỏ hàng đang trống" })).toBeVisible();
    await expect(page.getByRole("button", { name: CONFIRM })).toHaveCount(0);
  });
});

test.describe("orders", () => {
  test("the list shows the newest order first, and an unknown id is explained", async ({
    page,
  }) => {
    await placeOneOrder(page);
    await addAeroToCart(page);
    await openCheckout(page);
    await acknowledge(page).check();
    await page.getByRole("button", { name: CONFIRM }).click();
    await page.waitForURL(/\/orders\//);
    const second = await page.getByRole("heading", { level: 2, name: /^DC-V-/ }).textContent();

    const codes = await orderCodes(page);
    expect(codes).toHaveLength(2);
    expect(codes[0]).toBe(second);
    await expect(page.getByText("Đơn mô phỏng").first()).toBeVisible();

    await page.goto("/orders/does-not-exist-123");
    await expect(page.getByRole("heading", { name: "Không tìm thấy đơn này" })).toBeVisible();
  });

  test("a new order can be cancelled once, with confirmation, and stays cancelled", async ({
    page,
  }) => {
    const path = await placeOneOrder(page);
    await page.getByRole("button", { name: "Huỷ đơn mô phỏng" }).click();
    await expect(page.getByTestId("order-state")).toHaveText("Đã xác nhận đơn mô phỏng");
    await page.getByRole("button", { name: "Xác nhận huỷ đơn" }).click();
    await expect(page.getByTestId("order-state")).toHaveText("Đã huỷ (mô phỏng)");
    await expect(page.getByTestId("order-status")).toContainText("Đã huỷ đơn mô phỏng");
    await expect(page.getByRole("button", { name: "Huỷ đơn mô phỏng" })).toHaveCount(0);
    await page.goto(path);
    await expect(page.getByTestId("order-state")).toHaveText("Đã huỷ (mô phỏng)");
  });

  test("deleting an order needs confirmation and removes it from this device", async ({ page }) => {
    await placeOneOrder(page);
    await page.getByRole("button", { name: "Xoá đơn khỏi thiết bị này" }).click();
    await expect(page.getByText(/không thể hoàn tác/)).toBeVisible();
    await page.getByRole("button", { name: "Xác nhận xoá đơn" }).click();
    await page.waitForURL(/\/orders\?deleted=1$/);
    await expect(page.getByText("Đã xoá đơn khỏi thiết bị này.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chưa có đơn mô phỏng nào" })).toBeVisible();
  });
});

test.describe("data controls", () => {
  test("export then import in a clean browser restores the order; hostile files change nothing", async ({
    page,
    browser,
  }, testInfo) => {
    await placeOneOrder(page);
    const [code] = await orderCodes(page);

    await page.goto("/settings");
    await expect(page.getByRole("button", { name: "Tải bản sao lưu" })).toBeEnabled();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Tải bản sao lưu" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^dreamcart-sao-luu-\d{4}-\d{2}-\d{2}\.json$/);
    const file = testInfo.outputPath("backup.json");
    await download.saveAs(file);
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    expect(parsed).toMatchObject({ format: "dreamcart-export", simulation: true });
    expect(parsed.notice).toMatch(/không phải biên nhận/);
    expect(parsed.data.orders).toHaveLength(1);
    await expect(
      page.getByTestId("restore-status").or(page.getByRole("status")).first(),
    ).toBeAttached();

    const clean: BrowserContext = await browser.newContext();
    const fresh = await clean.newPage();
    expect(await orderCodes(fresh)).toEqual([]);
    await fresh.goto("/settings");
    await expect(fresh.getByRole("button", { name: "Tải bản sao lưu" })).toBeEnabled();

    // a hostile file is explained and changes nothing
    const hostile = testInfo.outputPath("hostile.json");
    const { writeFileSync } = await import("node:fs");
    writeFileSync(hostile, '{"format":"dreamcart-export","version":1,"__proto__":{"x":1}}');
    await fresh.getByLabel("Chọn tệp sao lưu (.json)").setInputFiles(hostile);
    await expect(fresh.getByRole("alert").getByText("Tệp không dùng được")).toBeVisible();
    const garbage = testInfo.outputPath("garbage.json");
    writeFileSync(garbage, "not json at all");
    await fresh.getByLabel("Chọn tệp sao lưu (.json)").setInputFiles(garbage);
    await expect(fresh.getByRole("alert").getByText("Tệp không phải JSON hợp lệ.")).toBeVisible();
    expect(await orderCodes(fresh)).toEqual([]);

    await fresh.goto("/settings");
    await expect(fresh.getByRole("button", { name: "Tải bản sao lưu" })).toBeEnabled();
    await fresh.getByLabel("Chọn tệp sao lưu (.json)").setInputFiles(file);
    await expect(fresh.getByTestId("restore-summary")).toContainText("1 đơn");
    await fresh.getByRole("button", { name: "Khôi phục", exact: true }).click();
    await expect(fresh.getByTestId("restore-status")).toContainText("thêm 1 đơn");
    expect(await orderCodes(fresh)).toEqual([code]);

    // restoring the same file again adds nothing
    await fresh.goto("/settings");
    await expect(fresh.getByRole("button", { name: "Tải bản sao lưu" })).toBeEnabled();
    await fresh.getByLabel("Chọn tệp sao lưu (.json)").setInputFiles(file);
    await fresh.getByRole("button", { name: "Khôi phục", exact: true }).click();
    await expect(fresh.getByTestId("restore-status")).toContainText(
      "thêm 0 đơn, bỏ qua 1 đơn đã có",
    );
    expect(await orderCodes(fresh)).toEqual([code]);
    await clean.close();
  });

  test("replacing everything needs its own confirmation", async ({ page }, testInfo) => {
    await placeOneOrder(page);
    await page.goto("/settings");
    await expect(page.getByRole("button", { name: "Tải bản sao lưu" })).toBeEnabled();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Tải bản sao lưu" }).click();
    const file = testInfo.outputPath("backup.json");
    await (await downloadPromise).saveAs(file);

    await page.getByLabel("Chọn tệp sao lưu (.json)").setInputFiles(file);
    await page.getByRole("radio", { name: /Thay thế tất cả/ }).check();
    const restore = page.getByRole("button", { name: "Khôi phục", exact: true });
    await expect(restore).toBeDisabled();
    await page
      .getByRole("checkbox", { name: /dữ liệu hiện có trên thiết bị này sẽ bị xoá/ })
      .check();
    await expect(restore).toBeEnabled();
    await restore.click();
    await expect(page.getByTestId("restore-status")).toContainText("Đã khôi phục");
    expect(await orderCodes(page)).toHaveLength(1);
  });

  test("reset removes every DreamCart record, and an emptied browser is noticed", async ({
    page,
  }) => {
    await placeOneOrder(page);
    await addAeroToCart(page);
    await page.goto("/settings");
    await expect(page.getByRole("button", { name: "Xoá toàn bộ dữ liệu" })).toBeDisabled();
    await page
      .getByRole("checkbox", { name: /toàn bộ dữ liệu DreamCart trên thiết bị này sẽ bị xoá/ })
      .check();
    await page.getByRole("button", { name: "Xoá toàn bộ dữ liệu" }).click();
    await expect(page.getByTestId("reset-status")).toContainText("Đã xoá toàn bộ dữ liệu");
    expect(await orderCodes(page)).toEqual([]);
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Giỏ hàng đang trống" })).toBeVisible();
    await expect(page.getByText(/từng có đơn hàng/)).toHaveCount(0);

    // a browser that had orders and now has none (cleared by something else) says so and points to the backup
    await page.evaluate(() => localStorage.setItem("dreamcart:had-data", "1"));
    await page.reload();
    const notice = page.getByRole("alert").filter({ hasText: "từng có đơn hàng" });
    await expect(notice).toBeVisible();
    await notice.getByRole("link", { name: "Mở Cài đặt" }).click();
    await expect(page).toHaveURL(/\/settings$/);
  });
});

for (const width of [375, 1280]) {
  test(`checkout, orders and settings have no overflow or accessibility violations at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await addAeroToCart(page);
    await openCheckout(page);
    const check = async () => {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      expect(await axeViolations(page)).toEqual([]);
    };
    await check();
    await acknowledge(page).check();
    await page.getByRole("button", { name: CONFIRM }).click();
    await page.waitForURL(/\/orders\//);
    await expect(page.getByTestId("order-state")).toBeVisible();
    await check();
    await page.goto("/orders");
    await expect(page.locator("main a p.font-mono")).toHaveCount(1);
    await check();
    await page.goto("/settings");
    await expect(page.getByRole("button", { name: "Tải bản sao lưu" })).toBeEnabled();
    await check();
  });
}
