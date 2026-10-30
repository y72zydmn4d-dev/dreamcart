import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Storefront in a real browser at the widths the design is checked at. The app runs on the synthetic fixture
 * catalog (the real catalog is empty until verified data exists), so every page also carries the "Dữ liệu mẫu" label.
 */
const WIDTHS = [375, 390, 768, 1024, 1440] as const;
const SYNTHETIC = "Dữ liệu mẫu";

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}
async function axeViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  return result.violations.map((v) => `${v.id} (${v.nodes.length})`);
}

for (const width of WIDTHS) {
  test.describe(`layout at ${width}px`, () => {
    // Reduced motion: buttons that become enabled after hydration would otherwise be measured mid-fade by axe.
    test.use({ viewport: { width, height: width < 768 ? 812 : 900 }, reducedMotion: "reduce" });

    for (const path of [
      "/",
      "/search",
      "/search?category=laptop",
      "/product/fx-aero",
      "/product/fx-buds-lite",
      "/credits",
      "/design",
      "/cart",
      "/import",
      "/checkout",
      "/orders",
      "/settings",
      "/privacy",
    ]) {
      test(`${path}: no horizontal overflow, labeled, accessible`, async ({ page }) => {
        await page.goto(path);
        expect(await noHorizontalOverflow(page)).toBe(true);
        // the simulation banner is always present; synthetic data says so wherever it appears
        await expect(page.getByRole("region", { name: /mô phỏng/i }).first()).toBeVisible();
        // pages that show no catalog data (credits, an empty cart, the import form) have nothing to label
        if (
          ![
            "/credits",
            "/cart",
            "/import",
            "/checkout",
            "/orders",
            "/settings",
            "/privacy",
          ].includes(path)
        )
          await expect(page.getByText(SYNTHETIC).first()).toBeVisible();
        expect(await axeViolations(page)).toEqual([]);
      });
    }
  });
}

test.describe("home", () => {
  test("hero search, featured products from the catalog, disclosure", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("search")).toBeVisible();
    const featured = page
      .getByRole("region", { name: /Nổi bật|Gợi ý|Tuyển chọn/i })
      .or(page.locator("#featured-heading").locator("xpath=ancestor::section"));
    await expect(featured.getByRole("link").first()).toBeVisible();
    await expect(
      page.getByText(/không thanh toán, không đặt hàng, không giao hàng thật/).first(),
    ).toBeVisible();
  });
});

test.describe("search", () => {
  test("typing shows catalog suggestions, Enter searches, results and URL agree", async ({
    page,
  }) => {
    await page.goto("/");
    const box = page.getByRole("combobox");
    const options = page.getByRole("option");
    // The page hydrates after first paint; typing that races hydration is retried, as a user would retype.
    await expect(async () => {
      await box.fill("");
      await box.fill("nov");
      await expect(options.first()).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 15_000 });
    await expect(box).toHaveAttribute("aria-expanded", "true");
    await box.press("Escape");
    await expect(box).toHaveAttribute("aria-expanded", "false");
    await box.fill("dien thoai nova");
    await expect(box).toHaveValue("dien thoai nova");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=dien%20thoai%20nova|\/search\?q=dien\+thoai\+nova/);
    await expect(
      page.getByRole("heading", { level: 2 }).filter({ hasText: "Fixturia Nova 5" }).first(),
    ).toBeVisible();
  });

  test("category tab, filter, chip and URL stay in sync, and a reload restores them", async ({
    page,
  }) => {
    await page.goto("/search");
    await page.getByRole("button", { name: /Điện thoại/ }).click();
    await expect(page).toHaveURL(/category=phone/);
    const storage256 = page.getByRole("checkbox", { name: /256 GB/ }).first();
    await storage256.check();
    await expect(page).toHaveURL(/storage_gb=256/);
    await expect(storage256).toBeChecked();
    const chip = page.getByRole("button", { name: /Bỏ lọc Bộ nhớ trong: 256 GB/ });
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(page).not.toHaveURL(/storage_gb/);
    // the URL is the source of truth: a reload restores the same state
    await page
      .getByRole("checkbox", { name: /256 GB/ })
      .first()
      .check();
    await expect(page).toHaveURL(/storage_gb=256/);
    await page.reload();
    await expect(page.getByRole("checkbox", { name: /256 GB/ }).first()).toBeChecked();
    await expect(page.getByRole("button", { name: /Điện thoại/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("sorting by price puts unpriced products last and orders the rest", async ({ page }) => {
    await page.goto("/search?sort=price-asc");
    await expect(page.locator("main ul li a").first()).toBeVisible(); // results render on the client
    const prices = await page.locator("main ul li a").evaluateAll((links) =>
      links.map((a) => {
        const m = /Từ\s+([\d.]+)/.exec(a.textContent ?? "");
        return m ? Number(m[1]!.replace(/\./g, "")) : null;
      }),
    );
    const priced = prices.filter((p): p is number => p !== null);
    expect(priced).toEqual([...priced].sort((a, b) => a - b));
    expect(prices.at(-1)).toBeNull(); // the unpriced product (Buds Lite) is last
  });

  test("empty and too-broad queries give honest states, never unrelated products", async ({
    page,
  }) => {
    await page.goto("/search?q=zzzzz");
    await expect(
      page.getByRole("heading", { name: /Không tìm thấy sản phẩm phù hợp/ }),
    ).toBeVisible();
    await expect(page.locator("main ul li a")).toHaveCount(0);
    await page.goto("/search?q=16gb+512gb");
    await expect(page.getByRole("heading", { name: /thêm một chút/ })).toBeVisible();
  });

  test("an unavailable combination is labeled 'not an exact match' with a reason", async ({
    page,
  }) => {
    await page.goto("/search?q=aero+15+inch+8gb+256gb");
    await expect(page.getByText("Không khớp chính xác").first()).toBeVisible();
    await expect(page.getByText(/chưa có cấu hình nào kết hợp tất cả/)).toBeVisible();
  });

  test("hostile URL parameters are ignored, never echoed", async ({ page }) => {
    await page.goto(
      "/search?category=toaster&sort=popularity&color=%3Cscript%3Ealert(1)%3C/script%3E&price=free",
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.content()).not.toContain("<script>alert(1)");
  });

  test.describe("mobile filter sheet", () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test("opens as a dialog, filters, shows the count, closes with Escape", async ({ page }) => {
      await page.goto("/search?category=phone");
      await page.getByRole("button", { name: /^Bộ lọc/ }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole("checkbox", { name: /256 GB/ })
        .first()
        .check();
      await expect(dialog.getByRole("button", { name: /Xem \d+ kết quả/ })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(page).toHaveURL(/storage_gb=256/);
    });
  });
});

test.describe("product page", () => {
  test("unknown or malformed ids are real 404s", async ({ page }) => {
    for (const path of [
      "/product/fx-unknown",
      "/product/placeholder",
      "/product/Not%20A%20Valid%20Id",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });

  test("configurator: dependent options, conflict confirmation, resolved variant with its own offers", async ({
    page,
  }) => {
    await page.goto("/product/fx-aero");
    const main = page.getByRole("main");
    await main.getByRole("button", { name: /^13 inch/ }).click();
    // 8 GB RAM does not exist with a 15 inch screen, and a 32 GB RAM option does not exist with 13 inch
    const ram32 = main.getByRole("button", { name: /^32 GB/ }).first();
    await expect(ram32).toContainText(/Không có với 13 inch/);
    await ram32.click();
    const alert = main.getByRole("alert");
    await expect(alert).toBeVisible();
    await alert.getByRole("button", { name: /Giữ nguyên/ }).click();
    await expect(alert).toBeHidden();
    // complete one real configuration: 13 inch + FX1 + 16 GB + 512 GB has two merchants
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
    await expect(offers.getByText("Cửa hàng Mẫu A (hư cấu)", { exact: true })).toBeVisible();
    await expect(offers.getByText("Cửa hàng Mẫu B (hư cấu)", { exact: true })).toBeVisible();
    await expect(offers.getByText(/Giá mẫu · ghi nhận/).first()).toBeVisible();
  });

  test("a verified configuration without a price says so; a stale price is flagged", async ({
    page,
  }) => {
    await page.goto("/product/fx-titan");
    const main = page.getByRole("main");
    await main
      .getByRole("button", { name: /^64 GB/ })
      .first()
      .click();
    await main.getByRole("button", { name: /^2 TB/ }).first().click();
    await main
      .getByRole("button", { name: /^Xanh đêm/ })
      .first()
      .click();
    await expect(
      main
        .getByText("Cấu hình có thật nhưng chưa có giá tham khảo")
        .locator("visible=true")
        .first(),
    ).toBeVisible();
    await page.goto("/product/fx-nova");
    const nova = page.getByRole("main");
    await nova
      .getByRole("button", { name: /^512 GB/ })
      .first()
      .click();
    await nova
      .getByRole("button", { name: /^Xám than chì/ })
      .first()
      .click();
    await expect(
      nova.getByText("Giá có thể đã thay đổi").locator("visible=true").first(),
    ).toBeVisible();
  });

  test("offers: non-VND keeps its currency, reference-only sources cannot be carted, links ask before leaving", async ({
    page,
  }) => {
    await page.goto("/product/fx-aero");
    const main = page.getByRole("main");
    for (const name of [/^15 inch/, /FX2/, /^32 GB/, /^1 TB/])
      await main.getByRole("button", { name }).first().click();
    await expect(main.getByText(/19,99/)).toBeVisible();
    await expect(main.getByText("Giữ nguyên tiền tệ gốc, không quy đổi")).toBeVisible();
    await expect(main.getByText("Chỉ thanh toán mô phỏng bằng VND")).toBeVisible();
    await page.goto("/product/fx-pulse");
    const pulse = page.getByRole("main");
    for (const name of [/^128 GB/, /^Đen/])
      await pulse.getByRole("button", { name }).first().click();
    await expect(pulse.getByText("Nguồn chỉ để tham khảo, không thêm vào giỏ")).toBeVisible();
    await pulse.getByRole("button", { name: "Xem nguồn mẫu (hư cấu)" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Bạn sắp rời DreamCart")).toBeVisible();
    const link = dialog.getByRole("link", { name: "Tiếp tục tới trang nguồn" });
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("href", /^https:\/\//);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("a product with no verified image shows the labeled placeholder, gallery thumbnails switch views", async ({
    page,
  }) => {
    await page.goto("/product/fx-aero");
    const gallery = page.getByRole("region", { name: /Thư viện ảnh/ });
    await expect(gallery.getByText(/không phải ảnh sản phẩm thật/)).toBeVisible();
    const side = gallery.getByRole("button", { name: /Xem ảnh: Cạnh bên/ });
    await side.click();
    await expect(side).toHaveAttribute("aria-pressed", "true");
  });

  test.describe("mobile summary", () => {
    for (const width of [375, 390]) {
      test(`stays compact at ${width}px and expands on demand`, async ({ page }) => {
        await page.setViewportSize({ width, height: 812 });
        await page.goto("/product/fx-aero");
        await page.evaluate(() => window.scrollTo(0, 800));
        const bar = page.locator("[data-bottom-bar]");
        // wait for hydration to leave exactly one bar (a transient second copy was seen once under load)
        await expect(bar).toHaveCount(1);
        await expect(bar).toBeVisible();
        const box = await bar.boundingBox();
        expect(box!.height).toBeLessThanOrEqual(812 * 0.2);
        const toggle = bar.locator("button[aria-expanded]");
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await page.keyboard.press("Escape");
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(await noHorizontalOverflow(page)).toBe(true);
      });
    }
  });

  test("keyboard: options are reachable and operable, focus is visible", async ({ page }) => {
    await page.goto("/product/fx-aero");
    const option = page.getByRole("main").getByRole("button", { name: /^13 inch/ });
    await option.focus();
    const outline = await option.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(option).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("transitions and animations are effectively disabled", async ({ page }) => {
    await page.goto("/product/fx-aero");
    const duration = await page
      .getByRole("main")
      .getByRole("button", { name: /^13 inch/ })
      .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
    expect(duration).toBeLessThan(0.01);
  });
});

test.describe("credits", () => {
  test("explains honestly that no image needs attribution yet", async ({ page }) => {
    await page.goto("/credits");
    await expect(page.getByText(/chưa có ảnh nào cần ghi công/)).toBeVisible();
  });
});
