import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADD } from "./support";

/**
 * QA finding F03: a complete configuration that no offer can put in the cart (Buds Lite has no price) used to show
 * an apparently available "Thêm vào giỏ mô phỏng" and only explained itself after the click. The action is now
 * withdrawn up front with the reason printed beside it. Incomplete and valid configurations keep their behavior.
 */
const UNAVAILABLE = "Chưa thể thêm — chưa có giá";

/** The summary that is actually on screen: the compact bar below 640px, the card above it. */
const visibleSummary = (page: Page) =>
  page.getByRole("region", { name: "Cấu hình của bạn" }).locator("visible=true").first();

async function expectCartEmpty(page: Page) {
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Giỏ hàng đang trống" })).toBeVisible();
}

for (const [label, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
] as const) {
  test.describe(`unpriced product on ${label}`, () => {
    test.use({ viewport, reducedMotion: "reduce" });

    test("Buds Lite says it cannot be added before any click, and nothing is carted", async ({
      page,
    }) => {
      await page.goto("/product/fx-buds-lite");
      const summary = visibleSummary(page);
      await expect(summary).toBeVisible();

      // The only configuration is already selected and the product has no price.
      const button = summary.getByRole("button", { name: "Chưa thể thêm", exact: true });
      await expect(button).toBeVisible();
      await expect(button).toBeDisabled();
      // The misleading call to action is gone from the summary, and the reason is visible text (not a tooltip).
      await expect(summary.getByRole("button", { name: ADD })).toHaveCount(0);
      const reason = summary.getByTestId("add-unavailable");
      await expect(reason).toContainText(UNAVAILABLE);
      // Screen readers get the same reason as the button's description.
      const describedBy = await button.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      await expect(page.locator(`[id="${describedBy}"]`)).toContainText(UNAVAILABLE);

      await expectCartEmpty(page);
    });

    test("the reason links to the merchant section that explains it", async ({ page }) => {
      await page.goto("/product/fx-buds-lite");
      const summary = visibleSummary(page);
      await summary.getByRole("link", { name: "Xem nơi bán đã ghi nhận" }).click();
      await expect(page).toHaveURL(/#offers-heading$/);
      const offers = page.locator("section[aria-labelledby='offers-heading']");
      await expect(offers.getByRole("heading", { name: "Nơi bán đã ghi nhận" })).toBeInViewport();
      await expect(offers.getByText("Chưa có giá").first()).toBeVisible();
    });

    test("the changed controls have no axe violations", async ({ page }) => {
      await page.goto("/product/fx-buds-lite");
      await expect(visibleSummary(page).getByTestId("add-unavailable")).toBeVisible();
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
    });
  });
}

test.describe("the other configuration states are unchanged", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  test("a valid priced Aero configuration keeps an enabled action that adds to the cart", async ({
    page,
  }) => {
    await page.goto("/product/fx-aero");
    const main = page.getByRole("main");
    for (const name of [/^13 inch/, /FX1/, /^16 GB/, /^512 GB/])
      await main.getByRole("button", { name }).first().click();
    const summary = visibleSummary(page);
    const add = summary.getByRole("button", { name: ADD });
    await expect(add).toBeEnabled();
    await expect(summary.getByTestId("add-unavailable")).toHaveCount(0);
    await add.click();
    await expect(summary.getByRole("status")).toContainText("Đã thêm vào giỏ mô phỏng");
  });

  test("an incomplete configuration stays operable and guides focus to the missing group", async ({
    page,
  }) => {
    await page.goto("/product/fx-aero");
    const summary = visibleSummary(page);
    const add = summary.getByRole("button", { name: ADD });
    await expect(add).toBeEnabled();
    await expect(summary.getByTestId("add-unavailable")).toHaveCount(0);
    await add.click();
    // Focus moves to the first group that still needs a choice; nothing was added.
    await expect(page.locator("[id$='-header-screen_in']")).toBeFocused();
    await expectCartEmpty(page);
  });

  test("a blocked source beside an eligible one does not withdraw the action", async ({ page }) => {
    // Pulse has a reference-only source AND an eligible one: the best eligible offer can still be carted.
    await page.goto("/product/fx-pulse");
    const main = page.getByRole("main");
    for (const name of [/^128 GB/, /^Đen/])
      await main.getByRole("button", { name }).first().click();
    const summary = visibleSummary(page);
    await expect(summary.getByRole("button", { name: ADD })).toBeEnabled();
    await expect(summary.getByTestId("add-unavailable")).toHaveCount(0);
    await expect(main.getByText("Nguồn chỉ để tham khảo, không thêm vào giỏ")).toBeVisible();
  });
});
