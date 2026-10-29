import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Cart and manual import in a real browser, on the synthetic fixture catalog. Each test gets a fresh browser context,
 * so the cart always starts empty. Prices are fixture prices ("Giá mẫu"), never real ones.
 */
const ADD = "Thêm vào giỏ mô phỏng";

// Axe must not measure colors while a button fades between states.
test.use({ reducedMotion: "reduce" });

async function configureAero13(page: Page) {
  await page.goto("/product/fx-aero");
  const main = page.getByRole("main");
  await main.getByRole("button", { name: /^13 inch/ }).click();
  await main.getByRole("button", { name: /FX1/ }).first().click();
  await main
    .getByRole("button", { name: /^16 GB/ })
    .first()
    .click();
  await main
    .getByRole("button", { name: /^512 GB/ })
    .first()
    .click();
  const offers = page.locator("section[aria-labelledby='offers-heading']");
  await expect(offers.getByRole("listitem")).toHaveCount(2);
  return offers;
}

const cartLink = (page: Page) => page.getByRole("link", { name: /^Giỏ hàng/ }).first();
const axeViolations = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id} (${v.nodes.length})`);

test.describe("add to cart", () => {
  test("an offer is added with an announcement, the header counts it, and a reload keeps it", async ({
    page,
  }) => {
    const offers = await configureAero13(page);
    await expect(cartLink(page)).toHaveAccessibleName("Giỏ hàng");
    await offers.getByRole("button", { name: ADD }).first().click();
    const status = offers.getByTestId("add-to-cart-status").first();
    await expect(status).toContainText("Đã thêm vào giỏ mô phỏng");
    await expect(status).toContainText("Cửa hàng Mẫu A (hư cấu)");
    await expect(cartLink(page)).toHaveAccessibleName(/Giỏ hàng.*1 sản phẩm trong giỏ/);

    await status.getByRole("link", { name: "Xem giỏ hàng" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    const group = page.getByRole("region", { name: /Nguồn: Cửa hàng Mẫu A/ });
    await expect(group.getByRole("heading", { level: 3 })).toBeVisible();
    await expect(group.getByText("Giá mẫu · ghi nhận")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("region", { name: /Nguồn: Cửa hàng Mẫu A/ })).toBeVisible();
    await expect(cartLink(page)).toHaveAccessibleName(/1 sản phẩm trong giỏ/);
  });

  test("the summary button adds the cheapest cartable offer and names the merchant", async ({
    page,
  }) => {
    await configureAero13(page);
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
    ).toContainText(/Cửa hàng Mẫu/);
    await expect(cartLink(page)).toHaveAccessibleName(/1 sản phẩm trong giỏ/);
  });

  test("adding the same offer again merges the quantity; another offer is its own line", async ({
    page,
  }) => {
    const offers = await configureAero13(page);
    const first = offers.getByRole("button", { name: ADD }).first();
    await first.click();
    await expect(offers.getByTestId("add-to-cart-status").first()).toContainText("Đã thêm");
    await expect(first).toBeEnabled();
    await first.click();
    await expect(cartLink(page)).toHaveAccessibleName(/2 sản phẩm trong giỏ/);
    await offers.getByRole("button", { name: ADD }).nth(1).click();
    await expect(cartLink(page)).toHaveAccessibleName(/3 sản phẩm trong giỏ/);

    await page.goto("/cart");
    await expect(page.getByRole("region", { name: /Nguồn: Cửa hàng Mẫu A/ })).toBeVisible();
    await expect(page.getByRole("region", { name: /Nguồn: Cửa hàng Mẫu B/ })).toBeVisible();
    await expect(page.getByRole("img", { name: /Số lượng .*: 2$/ })).toBeVisible();
  });

  test("offers that cannot be carted have no add button and say why", async ({ page }) => {
    await page.goto("/product/fx-pulse");
    const pulse = page.getByRole("main");
    for (const name of [/^128 GB/, /^Đen/])
      await pulse.getByRole("button", { name }).first().click();
    const offers = page.locator("section[aria-labelledby='offers-heading']");
    const referenceOnly = offers
      .getByRole("listitem")
      .filter({ hasText: "Nguồn chỉ để tham khảo, không thêm vào giỏ" });
    await expect(referenceOnly).toHaveCount(1);
    await expect(referenceOnly.getByRole("button", { name: ADD })).toHaveCount(0);

    await page.goto("/product/fx-aero");
    const main = page.getByRole("main");
    for (const name of [/^15 inch/, /FX2/, /^32 GB/, /^1 TB/])
      await main.getByRole("button", { name }).first().click();
    const usd = page
      .locator("section[aria-labelledby='offers-heading']")
      .getByRole("listitem")
      .filter({ hasText: "Chỉ thanh toán mô phỏng bằng VND" });
    await expect(usd).toHaveCount(1);
    await expect(usd.getByRole("button", { name: ADD })).toHaveCount(0);
  });
});

test.describe("cart page", () => {
  test("empty cart explains itself and offers the next step", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Giỏ hàng đang trống" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Khám phá sản phẩm" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nhập từ liên kết" })).toBeVisible();
  });

  test("quantity is bounded to 1–99 with a visible refusal, and a line can be removed", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const offers = await configureAero13(page);
    await offers.getByRole("button", { name: ADD }).first().click();
    await expect(cartLink(page)).toHaveAccessibleName(/1 sản phẩm trong giỏ/);
    await page.goto("/cart");

    const quantity = page.getByRole("img", { name: /Số lượng .*: \d+$/ });
    const decrease = page.getByRole("button", { name: /^Giảm số lượng/ });
    const increase = page.getByRole("button", { name: /^Tăng số lượng/ });
    await expect(quantity).toHaveAccessibleName(/: 1$/);
    await expect(decrease).toBeDisabled();
    for (let n = 2; n <= 99; n += 1) {
      await increase.click();
      await expect(quantity).toHaveAccessibleName(new RegExp(`: ${n}$`));
    }
    await increase.click();
    await expect(page.getByTestId("cart-status")).toContainText("Mỗi dòng tối đa 99");
    await expect(quantity).toHaveAccessibleName(/: 99$/);

    await decrease.click();
    await expect(quantity).toHaveAccessibleName(/: 98$/);
    await page.getByRole("button", { name: /^Xóa .* khỏi giỏ/ }).click();
    await expect(page.getByRole("heading", { name: "Giỏ hàng đang trống" })).toBeVisible();
    await expect(page.getByTestId("cart-status")).toContainText("Đã xóa");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Giỏ hàng đang trống" })).toBeVisible();
  });

  test("a changed price is flagged on the line and must be accepted", async ({ page }) => {
    const offers = await configureAero13(page);
    await offers.getByRole("button", { name: ADD }).first().click();
    await expect(cartLink(page)).toHaveAccessibleName(/1 sản phẩm trong giỏ/);
    await page.goto("/cart");
    await expect(page.getByText(/Giá đã thay đổi/)).toHaveCount(0);

    // simulate "the price I saw is not the price today" by editing the stored line, as an old cart would be
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
    await page.reload();
    const warning = page.getByText(/Giá đã thay đổi: lúc thêm là .*, hiện là/);
    await expect(warning).toBeVisible();
    await expect(page.getByText("Còn 1 mục cần xử lý trước khi thanh toán.")).toBeVisible();
    await page.getByRole("button", { name: "Chấp nhận giá mới", exact: true }).click();
    await expect(page.getByTestId("cart-status")).toContainText("Đã cập nhật giá");
    await expect(warning).toHaveCount(0);
    await expect(page.getByText(/mục cần xử lý/)).toHaveCount(0);
  });

  test("another tab's change appears here with a notice, and a later edit builds on it", async ({
    context,
    page,
  }) => {
    const offers = await configureAero13(page);
    await offers.getByRole("button", { name: ADD }).first().click();
    await expect(cartLink(page)).toHaveAccessibleName(/1 sản phẩm trong giỏ/);
    await page.goto("/cart");
    await expect(page.getByRole("region", { name: /Nguồn: Cửa hàng Mẫu A/ })).toBeVisible();
    // an action in this tab so it knows which revision is its own
    await page.getByRole("button", { name: /^Tăng số lượng/ }).click();
    await expect(page.getByRole("img", { name: /: 2$/ })).toBeVisible();

    const other = await context.newPage();
    const otherOffers = await configureAero13(other);
    await otherOffers.getByRole("button", { name: ADD }).nth(1).click();
    await expect(cartLink(other)).toHaveAccessibleName(/3 sản phẩm trong giỏ/);

    await expect(page.getByText("Giỏ hàng vừa được cập nhật từ một tab khác")).toBeVisible();
    await expect(page.getByRole("region", { name: /Nguồn: Cửa hàng Mẫu B/ })).toBeVisible();
    await page
      .getByRole("button", { name: /^Tăng số lượng/ })
      .first()
      .click();
    await expect(cartLink(page)).toHaveAccessibleName(/4 sản phẩm trong giỏ/);
    await expect(page.getByText("Giỏ hàng vừa được cập nhật từ một tab khác")).toBeHidden();
    await other.reload();
    await expect(cartLink(other)).toHaveAccessibleName(/4 sản phẩm trong giỏ/);
  });

  for (const width of [375, 1280]) {
    test(`a cart with items has no overflow and no accessibility violations at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const offers = await configureAero13(page);
      await offers.getByRole("button", { name: ADD }).first().click();
      await expect(cartLink(page).or(page.getByRole("button", { name: "Mở menu" }))).toBeVisible();
      await expect(offers.getByTestId("add-to-cart-status").first()).toContainText("Đã thêm");
      expect(await axeViolations(page)).toEqual([]);
      await page.goto("/cart");
      await expect(page.getByRole("region", { name: /Nguồn:/ })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      expect(await axeViolations(page)).toEqual([]);
    });
  }
});

test.describe("manual import", () => {
  // The save button is enabled only once the page has hydrated and storage is open; typing earlier would be lost.
  const open = async (page: Page) => {
    await page.goto("/import");
    await expect(page.getByRole("button", { name: "Lưu mục này" })).toBeEnabled();
  };
  const fill = async (page: Page, fields: { url?: string; title?: string; price?: string }) => {
    if (fields.url !== undefined) await page.getByLabel("Liên kết sản phẩm").fill(fields.url);
    if (fields.title !== undefined) await page.getByLabel("Tên sản phẩm").fill(fields.title);
    if (fields.price !== undefined)
      await page.getByLabel("Giá (không bắt buộc)").fill(fields.price);
  };

  test("hostile links are refused before anything is stored", async ({ page }) => {
    await open(page);
    for (const [url, message] of [
      ["javascript:alert(1)", /Chỉ nhận liên kết bắt đầu bằng http/],
      ["data:text/html,<script>alert(1)</script>", /Chỉ nhận liên kết bắt đầu bằng http/],
      ["https://user:secret@shop.example/x", /không được chứa tên đăng nhập/],
      ["not a link", /chưa phải là một liên kết hợp lệ/],
    ] as const) {
      await fill(page, { url, title: "Thử" });
      await expect(page.getByTestId("url-preview")).toHaveCount(0);
      await page.getByRole("button", { name: "Lưu mục này" }).click();
      await expect(page.getByRole("alert").getByText(message)).toBeVisible();
    }
    await expect(page.getByText("Chưa có mục nào.")).toBeVisible();
  });

  test("a valid link is cleaned and previewed, saved as unverified, kept on reload, and cartable only with a VND price", async ({
    page,
  }) => {
    const dialogs: string[] = [];
    page.on("dialog", (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    await open(page);
    await fill(page, {
      url: "https://shop.example/p/1?utm_source=news&color=red",
      title: '<img src=x onerror="alert(1)"> Tai nghe thử',
      price: "1.290.000",
    });
    await expect(page.getByTestId("url-preview")).toHaveText("https://shop.example/p/1?color=red");
    await expect(page.getByText("Đã bỏ tham số theo dõi: utm_source.")).toBeVisible();
    await expect(page.getByText(/tham số còn lại trong liên kết sẽ được lưu/)).toBeVisible();
    await page.getByRole("button", { name: "Lưu mục này" }).click();
    await expect(page.getByTestId("import-status")).toContainText("Mục này chưa được xác minh");

    const list = page.getByRole("region", { name: "Mục bạn đã nhập" });
    await expect(list.getByRole("heading", { level: 3 })).toContainText("<img src=x");
    await expect(list.getByText("Chưa xác minh")).toBeVisible();
    await expect(list.getByText("1.290.000")).toBeVisible();

    // an item without a price is stored but cannot be carted
    await fill(page, { url: "https://shop.example/p/2", title: "Món chưa biết giá", price: "" });
    await page.getByRole("button", { name: "Lưu mục này" }).click();
    const noPrice = list.getByRole("listitem").filter({ hasText: "Món chưa biết giá" });
    await expect(noPrice.getByText("Chưa có giá, không thể thêm vào giỏ")).toBeVisible();
    await expect(noPrice.getByRole("button", { name: ADD })).toHaveCount(0);

    await page.reload();
    await expect(list.getByRole("listitem")).toHaveCount(2);
    const priced = list.getByRole("listitem").filter({ hasText: "Tai nghe thử" });
    await priced.getByRole("button", { name: ADD }).click();
    await expect(priced.getByTestId("add-to-cart-status")).toContainText(
      "Đã thêm vào giỏ mô phỏng",
    );

    await page.goto("/cart");
    const group = page.getByRole("region", { name: "Nguồn: Do bạn nhập" });
    await expect(group.getByText("Chưa xác minh", { exact: true })).toBeVisible();
    await expect(group.getByText("Người dùng nhập, chưa xác minh")).toBeVisible();
    expect(dialogs).toEqual([]);

    // deleting the imported item leaves a clearly marked line, never a silent disappearance
    await open(page);
    await page.getByRole("button", { name: /^Xóa .*Tai nghe thử/ }).click();
    await page.getByRole("button", { name: /^Xác nhận xóa/ }).click();
    await page.goto("/cart");
    await expect(
      page
        .getByRole("region", { name: "Không còn trong dữ liệu" })
        .getByText("Mục này không còn trong dữ liệu. Hãy xóa khỏi giỏ."),
    ).toBeVisible();
  });

  test("the import page has no overflow or accessibility violations on a phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await open(page);
    await fill(page, { url: "javascript:1", title: "x" });
    await page.getByRole("button", { name: "Lưu mục này" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(await axeViolations(page)).toEqual([]);
  });
});
