import { expect, type Page } from "@playwright/test";

/** Shared steps for the cart, checkout and order specs. Not a spec itself (the file name has no `.spec`). */
export const ADD = "Thêm vào giỏ mô phỏng";
export const CONFIRM = "Tạo đơn mô phỏng";

export async function addAeroToCart(page: Page) {
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
  await offers.getByRole("button", { name: ADD }).first().click();
  await expect(offers.getByTestId("add-to-cart-status").first()).toContainText("Đã thêm");
}

export const acknowledge = (page: Page) =>
  page.getByRole("checkbox", { name: /Tôi hiểu đây là mô phỏng/ });

export async function openCheckout(page: Page) {
  await page.goto("/checkout");
  await expect(page.getByRole("button", { name: CONFIRM })).toBeEnabled();
}

/** Add an item, check out with the given scenario, and return the order's page path. */
export async function placeOneOrder(page: Page, scenario: RegExp = /Vừa/) {
  await addAeroToCart(page);
  await openCheckout(page);
  await page.getByRole("radio", { name: scenario }).check();
  await acknowledge(page).check();
  await page.getByRole("button", { name: CONFIRM }).click();
  await page.waitForURL(/\/orders\/[^/?]+\?placed=1$/);
  return new URL(page.url()).pathname;
}

export async function orderCodes(page: Page) {
  await page.goto("/orders");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByText(/Chưa có đơn mô phỏng nào|DC-V-/).first()).toBeVisible();
  return page.locator("main a p.font-mono").allTextContents();
}
