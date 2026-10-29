import { expect, test, type Page } from "@playwright/test";
import { ADD, addAeroToCart, placeOneOrder } from "./support";

/**
 * Failure injection in real engines: storage that is missing, full, corrupted or from a newer DreamCart. The app must
 * stay usable where it can, say what happened where it cannot, and never lose or overwrite data it did not create.
 */
test.use({ reducedMotion: "reduce" });

const header = (page: Page) => page.getByRole("navigation", { name: "Điều hướng chính" });

/** Run in the page: write a raw record into one of DreamCart's IndexedDB stores. */
async function putRaw(page: Page, store: string, key: string | null, value: unknown) {
  await page.evaluate(
    ([storeName, recordKey, record]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("dreamcart");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(storeName as string, "readwrite");
          const objectStore = tx.objectStore(storeName as string);
          if (recordKey === null) objectStore.put(record);
          else objectStore.put(record, recordKey as string);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [store, key, value] as const,
  );
}

test("without IndexedDB the app still works in memory and says the data will not be kept", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", { value: undefined, configurable: true });
  });
  await addAeroToCart(page);
  const notice = page.getByRole("alert").filter({ hasText: "Dữ liệu của bạn không được lưu" });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("chỉ tồn tại đến khi bạn đóng trang");
  await expect(header(page).getByRole("link", { name: /^Giỏ hàng/ })).toHaveAccessibleName(
    /1 sản phẩm trong giỏ/,
  );
  // memory lives as long as the page: client-side navigation keeps it, and the notice stays on every page
  await header(page)
    .getByRole("link", { name: /^Giỏ hàng/ })
    .click();
  await expect(page.getByRole("region", { name: /Nguồn:/ })).toBeVisible();
  await expect(notice).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Giỏ hàng đang trống" })).toBeVisible();
});

test("a full disk is reported and the cart is left exactly as it was", async ({ page }) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof original>) {
      if ((window as unknown as { __full?: boolean }).__full) {
        throw new DOMException("simulated full storage", "QuotaExceededError");
      }
      return original.apply(this, args);
    };
  });
  await addAeroToCart(page);
  await expect(header(page).getByRole("link", { name: /^Giỏ hàng/ })).toHaveAccessibleName(
    /1 sản phẩm trong giỏ/,
  );
  await page.evaluate(() => ((window as unknown as { __full: boolean }).__full = true));
  const offers = page.locator("section[aria-labelledby='offers-heading']");
  await offers.getByRole("button", { name: ADD }).first().click();
  await expect(offers.getByTestId("add-to-cart-status").first()).toContainText(
    "bộ nhớ trình duyệt đã đầy",
  );
  await expect(offers.getByTestId("add-to-cart-status").first()).toContainText(
    "Giỏ hàng chưa thay đổi",
  );
  await page.evaluate(() => ((window as unknown as { __full: boolean }).__full = false));
  await page.reload();
  await expect(header(page).getByRole("link", { name: /^Giỏ hàng/ })).toHaveAccessibleName(
    /1 sản phẩm trong giỏ/,
  );
});

test("corrupted records are set aside, never shown, and the app keeps working", async ({
  page,
}) => {
  await placeOneOrder(page);
  await putRaw(page, "cart", "current", { lines: "not a list", revision: -5 });
  await putRaw(page, "orders", null, { id: "broken-order-1", code: "nope" });
  await page.goto("/orders");
  const notice = page.getByRole("alert").filter({ hasText: "bản ghi bị lỗi đã được tách riêng" });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("không bị xoá");
  // the valid order is still listed; the broken one is not
  await expect(page.locator("main a p.font-mono")).toHaveCount(1);
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Giỏ hàng đang trống" })).toBeVisible();
  await addAeroToCart(page);
  await expect(header(page).getByRole("link", { name: /^Giỏ hàng/ })).toHaveAccessibleName(
    /1 sản phẩm trong giỏ/,
  );
});

test("a database from a newer DreamCart is never overwritten or downgraded", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // another (newer) copy of the app upgrades the database while this tab is open
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("dreamcart", 99);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          open.result.close();
          resolve();
        };
      }),
  );
  await page.reload();
  const notice = page.getByRole("alert").filter({ hasText: "phiên bản DreamCart mới hơn" });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("không ghi đè hay xoá");
  const version = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open("dreamcart");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const v = open.result.version;
          open.result.close();
          resolve(v);
        };
      }),
  );
  expect(version).toBe(99);
});
