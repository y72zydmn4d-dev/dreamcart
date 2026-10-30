import { expect, test } from "@playwright/test";
import { ADD, addAeroToCart } from "./support";

/**
 * QA finding F02: the homepage and About page used to say shoppers were using real, verifiable products while the
 * catalog was the fictional Fixturia fixtures. The copy follows the catalog mode now; these specs run on the
 * synthetic catalog (the only data until a verified real catalog exists) and check that every shared surface agrees.
 */
const AFFIRMATIVE_REAL_CLAIMS = [
  /Mua sắm mô phỏng với sản phẩm thật/,
  /Sản phẩm là sản phẩm thật/,
  /nguồn có thể kiểm chứng/,
];

test("homepage, About, footer and page metadata all say the catalog is fictional demonstration data", async ({
  page,
}) => {
  await page.goto("/");
  const home = page.getByRole("main");
  await expect(home.getByText("Bản trình diễn · Sản phẩm hư cấu, giá mẫu")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("sản phẩm Fixturia là hư cấu");
  await expect(page.getByRole("contentinfo")).toContainText("Danh mục sản phẩm thật chưa mở");
  await expect(page.locator("meta[name='description']")).toHaveAttribute("content", /hư cấu/);
  for (const claim of AFFIRMATIVE_REAL_CLAIMS)
    await expect(page.locator("body")).not.toContainText(claim);

  await page.goto("/about");
  const about = page.getByRole("main");
  await expect(about.getByRole("heading", { level: 2 })).toHaveText([
    "DreamCart hiện cung cấp gì",
    "Những gì không bao giờ xảy ra thật",
    "Dữ liệu mẫu hư cấu",
    "Dự kiến trong tương lai",
  ]);
  await expect(about.getByText(/sản phẩm Fixturia hư cấu/)).toBeVisible();
  await expect(about.getByText("Giá hiển thị là giá mẫu")).toBeVisible();
  await expect(about.getByText(/sẽ chỉ xuất hiện sau khi được biên tập và xác minh/)).toBeVisible();
  for (const claim of AFFIRMATIVE_REAL_CLAIMS) await expect(about).not.toContainText(claim);
});

test("the simulated-transaction disclosures are still present on the homepage and About", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("main")).toContainText(
    "Không thanh toán thật · Không đặt hàng thật · Không giao hàng thật",
  );
  await page.goto("/about");
  await expect(page.getByText(/Không có khoản thanh toán thật/)).toBeVisible();
  await expect(page.getByText(/Không đặt hàng với cửa hàng thật/)).toBeVisible();
  await expect(page.getByText(/Không có giao hàng thật/)).toBeVisible();
});

test("a fictional source link says it is a sample, not a verified merchant", async ({ page }) => {
  await page.goto("/product/fx-aero");
  const main = page.getByRole("main");
  for (const name of [/^13 inch/, /FX1/, /^16 GB/, /^512 GB/])
    await main.getByRole("button", { name }).first().click();
  // Neither the old "Xem trang nguồn" wording nor an authentic-looking merchant link remains.
  await expect(main.getByRole("button", { name: "Xem trang nguồn" })).toHaveCount(0);
  await main.getByRole("button", { name: "Xem nguồn mẫu (hư cấu)" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("địa chỉ mẫu của một cửa hàng hư cấu");
  await expect(dialog).toContainText("không thể xác minh");
  await expect(dialog).toContainText("Bạn sẽ không mua gì thông qua DreamCart");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("the cart keeps the same fictional-source wording after adding a catalog item", async ({
  page,
}) => {
  await addAeroToCart(page);
  await page.goto("/cart");
  const line = page.getByRole("article").first();
  await expect(line.getByText("Dữ liệu mẫu")).toBeVisible();
  await expect(line.getByRole("button", { name: "Xem nguồn mẫu (hư cấu)" })).toBeVisible();
  await expect(line.getByRole("button", { name: ADD })).toHaveCount(0);
});
