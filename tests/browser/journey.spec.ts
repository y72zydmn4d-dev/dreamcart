import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { ADD, CONFIRM, acknowledge } from "./support";

/**
 * The whole simulated shopping journey in one real browser session, 21 steps from the home page to "delete all my
 * data", on the synthetic fixture catalog with a controlled clock. Every step is a user action or an assertion about
 * what the user sees; the last assertions check that nothing ever left this site.
 */
test.use({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });

const START = new Date("2026-10-29T12:00:00Z");

test("21-step journey: discover, configure, cart, import, checkout, deliver, collect, export, erase", async ({
  page,
}, testInfo) => {
  test.setTimeout(150_000);
  await page.clock.install({ time: START });
  const origins = new Set<string>();
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.protocol.startsWith("http")) origins.add(url.origin);
  });
  const header = page.getByRole("navigation", { name: "Điều hướng chính" });
  const cartCount = (n: number) =>
    expect(header.getByRole("link", { name: /^Giỏ hàng/ })).toHaveAccessibleName(
      new RegExp(`${n} sản phẩm trong giỏ`),
    );
  const offers = page.locator("section[aria-labelledby='offers-heading']");
  const main = page.getByRole("main");

  await test.step("1. Open the home page: the simulation is stated and fixtures are labeled", async () => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByText(/không thanh toán, không đặt hàng, không giao hàng thật/).first(),
    ).toBeVisible();
    await expect(page.getByText("Dữ liệu mẫu").first()).toBeVisible();
  });

  await test.step("2. Search from the hero for a laptop", async () => {
    const box = page.getByRole("combobox");
    await expect(async () => {
      await box.fill("");
      await box.fill("aero");
      await expect(box).toHaveValue("aero");
      await box.press("Enter");
      await expect(page).toHaveURL(/\/search\?q=aero/, { timeout: 3000 });
    }).toPass({ timeout: 20_000 });
    await expect(
      page.getByRole("heading", { level: 2 }).filter({ hasText: "Aero" }).first(),
    ).toBeVisible();
  });

  await test.step("3. Narrow the results with the laptop category", async () => {
    await page.getByRole("button", { name: /Laptop/ }).click();
    await expect(page).toHaveURL(/category=laptop/);
  });

  await test.step("4. Open the product page", async () => {
    await page.getByRole("link", { name: /Aero/ }).first().click();
    await expect(page).toHaveURL(/\/product\/fx-aero$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Aero");
  });

  await test.step("5. Configure 13 inch, FX1, 16 GB, 512 GB; the dependent options explain gaps", async () => {
    await main.getByRole("button", { name: /^13 inch/ }).click();
    await expect(main.getByRole("button", { name: /^32 GB/ }).first()).toContainText(
      /Không có với 13 inch/,
    );
    await main.getByRole("button", { name: /FX1/ }).first().click();
    await main
      .getByRole("button", { name: /^16 GB/ })
      .first()
      .click();
    await main
      .getByRole("button", { name: /^512 GB/ })
      .first()
      .click();
    await expect(offers.getByRole("listitem")).toHaveCount(2);
  });

  await test.step("6. Every merchant shows its price with provenance", async () => {
    await expect(offers.getByText("Cửa hàng Mẫu A (hư cấu)", { exact: true })).toBeVisible();
    await expect(offers.getByText("Cửa hàng Mẫu B (hư cấu)", { exact: true })).toBeVisible();
    await expect(offers.getByText(/Giá mẫu · ghi nhận/).first()).toBeVisible();
  });

  await test.step("7. Add the cheapest offer from the summary bar; it is announced", async () => {
    await page
      .getByRole("region", { name: "Cấu hình của bạn" })
      .locator("visible=true")
      .getByRole("button", { name: ADD })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: /Đã thêm vào giỏ mô phỏng/ })
        .locator("visible=true"),
    ).toContainText("Cửa hàng Mẫu");
    await cartCount(1);
  });

  await test.step("8. Add the other merchant's offer as its own line", async () => {
    const buttons = offers.getByRole("button", { name: ADD });
    await expect(buttons).toHaveCount(2);
    await buttons.nth(1).click();
    await cartCount(2);
  });

  await test.step("9. The cart groups the two lines by source", async () => {
    await header.getByRole("link", { name: /^Giỏ hàng/ }).click();
    await expect(page.getByRole("region", { name: /Nguồn: Cửa hàng Mẫu A/ })).toBeVisible();
    await expect(page.getByRole("region", { name: /Nguồn: Cửa hàng Mẫu B/ })).toBeVisible();
  });

  await test.step("10. Raise a quantity; the cart count follows", async () => {
    await page
      .getByRole("button", { name: /^Tăng số lượng/ })
      .first()
      .click();
    await expect(page.getByRole("img", { name: /: 2$/ })).toBeVisible();
    await cartCount(3);
  });

  await test.step("11. Remove one line", async () => {
    await page
      .getByRole("button", { name: /^Xoá .* khỏi giỏ/ })
      .last()
      .click();
    await expect(page.getByTestId("cart-status")).toContainText("Đã xoá");
    await cartCount(2);
  });

  await test.step("12. Import a product by link: the link is cleaned and the item is unverified", async () => {
    await header.getByRole("link", { name: "Nhập liên kết" }).click();
    await expect(page.getByRole("button", { name: "Lưu mục này" })).toBeEnabled();
    await page
      .getByLabel("Liên kết sản phẩm")
      .fill("https://shop.example/p/9?utm_source=ad&color=black");
    await expect(page.getByTestId("url-preview")).toHaveText(
      "https://shop.example/p/9?color=black",
    );
    await page.getByLabel("Tên sản phẩm").fill("Tai nghe tự nhập");
    await page.getByLabel("Giá (không bắt buộc)").fill("990.000");
    await page.getByRole("button", { name: "Lưu mục này" }).click();
    await expect(page.getByTestId("import-status")).toContainText("chưa được xác minh");
  });

  await test.step("13. Add the imported item to the cart", async () => {
    const item = page.getByRole("region", { name: "Mục bạn đã nhập" }).getByRole("listitem");
    await item.getByRole("button", { name: ADD }).click();
    await expect(item.getByTestId("add-to-cart-status")).toContainText("Đã thêm");
    await cartCount(3);
  });

  await test.step("14. The cart survives a reload and shows the imported item as the user's own", async () => {
    await page.goto("/cart");
    await page.reload();
    await expect(page.getByRole("region", { name: "Nguồn: Do bạn nhập" })).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Nguồn: Do bạn nhập" })
        .getByText("Chưa xác minh", { exact: true }),
    ).toBeVisible();
    await cartCount(3);
  });

  await test.step("15. Go to the simulated checkout", async () => {
    await page.getByRole("link", { name: "Thanh toán mô phỏng" }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByText("MÔ PHỎNG · KHÔNG PHẢI HOÁ ĐƠN")).toBeVisible();
    await expect(page.getByRole("button", { name: CONFIRM })).toBeEnabled();
  });

  await test.step("16. Confirming without the acknowledgement is refused", async () => {
    await page.getByRole("radio", { name: /Vừa/ }).check();
    await page.getByRole("radio", { name: /Dream Workspace/ }).check();
    await page.getByRole("button", { name: CONFIRM }).click();
    await expect(page.getByRole("alert").filter({ hasText: "ô xác nhận" })).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  await test.step("17. Acknowledge and confirm: one virtual order with a DC-V code", async () => {
    await acknowledge(page).check();
    await page.getByRole("button", { name: CONFIRM }).click();
    await page.waitForURL(/\/orders\/[^/?]+\?placed=1$/);
    await expect(page.getByRole("heading", { name: "Đã tạo đơn mô phỏng" })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /^DC-V-[0-9A-Z]{10}$/ }),
    ).toBeVisible();
    await expect(page.getByTestId("order-state")).toHaveText("Đã xác nhận đơn mô phỏng");
  });

  await test.step("18. The cart is empty and the orders list holds the order", async () => {
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Giỏ hàng đang trống" })).toBeVisible();
    await page.goto("/orders");
    await expect(page.locator("main a p.font-mono")).toHaveCount(1);
  });

  await test.step("19. Time passes: the simulated order is delivered", async () => {
    await page.locator("main a p.font-mono").click();
    // let the order page finish loading before time moves (a slow engine would otherwise jump past its own timers)
    await expect(page.getByTestId("order-state")).toHaveText("Đã xác nhận đơn mô phỏng");
    await page.clock.runFor(60_000);
    await expect(page.getByTestId("order-state")).toHaveText("Đã đóng gói (ảo)");
    await page.clock.runFor(150_000);
    await expect(page.getByTestId("order-state")).toHaveText("Đã giao ảo");
    await expect(page.getByRole("heading", { name: "Đã giao ảo" })).toBeVisible();
  });

  await test.step("20. My Collection shows each delivered item exactly once", async () => {
    await page.getByRole("link", { name: "Xem Bộ sưu tập" }).click();
    await expect(page).toHaveURL(/\/collection$/);
    const cards = page.locator("main li").filter({ hasText: "Giao ảo từ đơn" });
    await expect(cards).toHaveCount(2);
    await expect(cards.filter({ hasText: "Tai nghe tự nhập" })).toHaveCount(1);
    await expect(cards.filter({ hasText: /Aero/ })).toHaveCount(1);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  await test.step("21. Export a backup, then delete all data: nothing remains and nothing left the site", async () => {
    await page.goto("/settings");
    await expect(page.getByRole("button", { name: "Tải bản sao lưu" })).toBeEnabled();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Tải bản sao lưu" }).click();
    const file = testInfo.outputPath("journey-backup.json");
    await (await download).saveAs(file);
    const backup = JSON.parse(readFileSync(file, "utf8"));
    expect(backup).toMatchObject({ format: "dreamcart-export", simulation: true });
    expect(backup.data.orders).toHaveLength(1);
    expect(backup.data.userProducts).toHaveLength(1);

    await page
      .getByRole("checkbox", { name: /toàn bộ dữ liệu DreamCart trên thiết bị này sẽ bị xoá/ })
      .check();
    await page.getByRole("button", { name: "Xoá toàn bộ dữ liệu" }).click();
    await expect(page.getByTestId("reset-status")).toContainText("Đã xoá toàn bộ dữ liệu");
    for (const [path, empty] of [
      ["/cart", "Giỏ hàng đang trống"],
      ["/orders", "Chưa có đơn mô phỏng nào"],
      ["/collection", "Bộ sưu tập đang trống"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: empty })).toBeVisible();
    }
    await page.goto("/import");
    await expect(page.getByText("Chưa có mục nào.")).toBeVisible();

    const site = new URL(page.url()).origin;
    expect([...origins].filter((o) => o !== site)).toEqual([]);
  });
});
