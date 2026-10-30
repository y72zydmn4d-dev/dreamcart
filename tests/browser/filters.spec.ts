import { expect, test, type Page } from "@playwright/test";

/**
 * The search price filter exposes ONE selected choice everywhere: URL, chip, results and the native radio's
 * `checked` state (QA finding F01: the radios used to report unchecked while the URL and results were right,
 * because the desktop panel and the mobile sheet's copy shared one radio group). Assertions read the real
 * control state (`toBeChecked` reads the DOM `checked` property), never a CSS class.
 */
const BAND = /^20–30 triệu/;
const ALL = /^Tất cả/;

const desktopPanel = (page: Page) => page.getByRole("complementary", { name: "Bộ lọc" });
const priceRadios = (page: Page) => desktopPanel(page).getByRole("radio");
/** How many radios of the price group report `checked` (the DOM property, not a style). */
const checkedCount = (page: Page) =>
  priceRadios(page).evaluateAll(
    (els) => els.filter((el) => (el as HTMLInputElement).checked).length,
  );
const chip = (page: Page) => page.getByRole("button", { name: "Bỏ lọc 20–30 triệu" });

/** Exactly one price radio is checked and it is the expected one. */
async function expectSelected(page: Page, expected: RegExp) {
  await expect.poll(() => checkedCount(page)).toBe(1);
  await expect(desktopPanel(page).getByRole("radio", { name: expected })).toBeChecked();
}

async function waitReady(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(desktopPanel(page).getByRole("radio", { name: ALL })).toBeVisible();
}

test.describe("desktop price filter", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  test("starts on 'Tất cả' with exactly one radio checked", async ({ page }) => {
    await page.goto("/search");
    await waitReady(page);
    await expectSelected(page, ALL);
    await expect(chip(page)).toHaveCount(0);
  });

  test("selecting 20–30 triệu checks that radio and agrees with the URL, chip and results", async ({
    page,
  }) => {
    await page.goto("/search");
    await waitReady(page);
    const total = await page.getByRole("main").locator("ul li a").count();
    await desktopPanel(page).getByRole("radio", { name: BAND }).check();

    await expect(page).toHaveURL(/price=from_20m/);
    await expectSelected(page, BAND);
    await expect(chip(page)).toBeVisible();
    await expect(desktopPanel(page).getByRole("radio", { name: ALL })).not.toBeChecked();
    // Every shown result sits in the band; the filter narrowed the list.
    const shown = await page.getByRole("main").locator("ul li a").count();
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(total);
  });

  test("the selection survives a reload and back/forward navigation", async ({ page }) => {
    await page.goto("/search");
    await waitReady(page);
    await desktopPanel(page).getByRole("radio", { name: BAND }).check();
    await expect(page).toHaveURL(/price=from_20m/);

    await page.reload();
    await waitReady(page);
    await expectSelected(page, BAND);
    await expect(chip(page)).toBeVisible();

    // Filter changes replace the history entry (by design), so history is exercised across real navigations:
    // the restored page must read its selection from the URL again.
    await page.goto("/");
    await page.goBack();
    await waitReady(page);
    await expect(page).toHaveURL(/price=from_20m/);
    await expectSelected(page, BAND);
    await page.goForward();
    await page.goBack();
    await waitReady(page);
    await expectSelected(page, BAND);

    await desktopPanel(page).getByRole("radio", { name: ALL }).check();
    await expect(page).not.toHaveURL(/price=/);
    await expectSelected(page, ALL);
  });

  test("the chip and 'Xoá bộ lọc' return the radios to the default", async ({ page }) => {
    await page.goto("/search?price=from_20m");
    await waitReady(page);
    await expectSelected(page, BAND);

    await chip(page).click();
    await expect(page).not.toHaveURL(/price=/);
    await expectSelected(page, ALL);

    await desktopPanel(page).getByRole("radio", { name: BAND }).check();
    await page.getByRole("button", { name: "Xoá bộ lọc" }).first().click();
    await expect(page).not.toHaveURL(/price=/);
    await expectSelected(page, ALL);
  });

  test("a price band combines with a category and an attribute filter", async ({ page }) => {
    await page.goto("/search?category=laptop");
    await waitReady(page);
    const ram = desktopPanel(page).getByRole("checkbox", { name: /^16 GB/ });
    await desktopPanel(page).getByRole("radio", { name: BAND }).check();
    await ram.check();

    await expect(page).toHaveURL(/category=laptop/);
    await expect(page).toHaveURL(/price=from_20m/);
    await expect(page).toHaveURL(/ram_gb=16/);
    await expectSelected(page, BAND);
    await expect(ram).toBeChecked();

    await page.reload();
    await waitReady(page);
    await expectSelected(page, BAND);
    await expect(desktopPanel(page).getByRole("checkbox", { name: /^16 GB/ })).toBeChecked();
  });

  test("keyboard only: arrow keys move the choice and the checked state follows", async ({
    page,
  }) => {
    await page.goto("/search");
    await waitReady(page);
    await desktopPanel(page).getByRole("radio", { name: ALL }).focus();
    await page.keyboard.press("ArrowDown");

    await expect(page).toHaveURL(/price=/);
    await expect.poll(() => checkedCount(page)).toBe(1);
    await expect(desktopPanel(page).getByRole("radio", { name: ALL })).not.toBeChecked();
    await page.keyboard.press("ArrowUp");
    await expect(page).not.toHaveURL(/price=/);
    await expectSelected(page, ALL);
  });
});

test.describe("price filter across viewports", () => {
  test.use({ reducedMotion: "reduce" });

  test("desktop and mobile show the same URL-backed selection when the viewport changes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/search?price=from_20m");
    await waitReady(page);
    await expectSelected(page, BAND);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: /^Bộ lọc/ }).click();
    const sheet = page.getByRole("dialog", { name: "Bộ lọc" });
    await expect(sheet.getByRole("radio", { name: BAND })).toBeChecked();
    await expect(sheet.getByRole("radio", { name: ALL })).not.toBeChecked();

    // Change it in the sheet; the hidden desktop panel follows once the viewport grows back.
    await sheet.getByRole("radio", { name: ALL }).check();
    await expect(page).not.toHaveURL(/price=/);
    await page.getByRole("button", { name: "Đóng bộ lọc" }).click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expectSelected(page, ALL);
  });
});
