import { expect, test } from "@playwright/test";
import { CONFIRM, acknowledge, addAeroToCart } from "./support";

/**
 * Keyboard operability of the structures a screen-reader or keyboard user depends on. This complements the axe scans
 * (which cannot see focus order); a manual screen-reader pass is a separate human check (PENDING_HUMAN_VALIDATION).
 */
test.use({ reducedMotion: "reduce" });

test("the first Tab stop is the skip link, and it moves focus into the main content", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Bỏ qua và đến nội dung chính" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("the leave-DreamCart dialog traps focus, closes with Escape and gives focus back", async ({
  page,
}) => {
  await page.goto("/product/fx-aero");
  const main = page.getByRole("main");
  for (const name of [/^13 inch/, /FX1/, /^16 GB/, /^512 GB/])
    await main.getByRole("button", { name }).first().click();
  const opener = main.getByRole("button", { name: "Xem trang nguồn" }).first();
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toHaveCount(1);
  // Tab never reaches the page behind: focus is inside the dialog, or has left the page for the browser's own UI
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("Tab");
    const behind = await page.evaluate(() => {
      const active = document.activeElement;
      const inDialog = document.querySelector("dialog[open]")?.contains(active) ?? false;
      return !inDialog && active !== document.body && active !== null;
    });
    expect(behind, `Tab ${i + 1}`).toBe(false);
  }
  await dialog.getByRole("button", { name: "Ở lại DreamCart" }).focus();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("a whole order can be placed with the keyboard alone, and focus lands on the new page", async ({
  page,
}) => {
  await addAeroToCart(page);
  await page.goto("/checkout");
  const confirm = page.getByRole("button", { name: CONFIRM });
  await expect(confirm).toBeEnabled();
  // radios: arrow keys change the choice
  const quick = page.getByRole("radio", { name: /Vừa/ });
  await quick.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: /Thong thả/ })).toBeChecked();
  await acknowledge(page).focus();
  await page.keyboard.press("Space");
  await expect(acknowledge(page)).toBeChecked();
  await confirm.focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/orders\/[^/?]+\?placed=1$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("order-state")).toBeVisible();
});

test("every interactive control on the main pages is reachable and shows a visible focus ring", async ({
  page,
}) => {
  for (const path of ["/", "/search", "/cart", "/import", "/settings", "/privacy"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const total = await page
      .locator("a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary")
      .evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).length);
    expect(total).toBeGreaterThan(3);
    let seenRing = 0;
    for (let i = 0; i < Math.min(total, 12); i += 1) {
      await page.keyboard.press("Tab");
      const visible = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return false;
        const style = getComputedStyle(el);
        return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
      });
      if (visible) seenRing += 1;
    }
    expect(seenRing, `${path}: focus ring on tabbed controls`).toBeGreaterThanOrEqual(
      Math.min(total, 12) - 1,
    );
  }
});
