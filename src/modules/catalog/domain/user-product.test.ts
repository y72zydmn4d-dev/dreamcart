import { describe, expect, it } from "vitest";
import {
  createUserProduct,
  parseAmountText,
  userOfferId,
  type UserProductDraft,
} from "./user-product";

const ctx = { nowMs: 1_700_000_000_000, uuid: "3f2b8c1e-aaaa-4bbb-8ccc-0123456789ab" };
const draft = (over: Partial<UserProductDraft> = {}): UserProductDraft => ({
  title: "  Tai nghe   thử  ",
  sourceUrl: "https://shop.example/p/1?utm_source=x&color=red",
  priceText: "1.290.000",
  currency: "VND",
  attributes: [{ name: "Màu", value: "Đen" }],
  ...over,
});

describe("parseAmountText", () => {
  it.each([
    ["24990000", "VND", 24_990_000],
    ["24.990.000", "VND", 24_990_000],
    ["24,990,000", "VND", 24_990_000],
    ["24 990 000", "VND", 24_990_000],
    ["990", "VND", 990],
    ["1,299.99", "USD", 129_999],
    ["1.299,99", "EUR", 129_999],
    ["1299", "USD", 129_900],
    ["12.5", "USD", 1_250],
    ["0.99", "USD", 99],
    ["1000", "JPY", 1_000],
  ] as const)("reads %s %s as %d minor units", (text, currency, expected) => {
    expect(parseAmountText(text, currency)).toBe(expected);
  });

  it.each([
    ["", "VND"],
    ["abc", "VND"],
    ["0", "VND"],
    ["1.2.3", "VND"],
    ["12.34", "VND"], // not a thousands grouping, and VND has no decimals
    ["1,2345", "VND"],
    ["-5", "VND"],
    ["1e6", "VND"],
    ["0x10", "VND"],
    ["1.234,5678", "USD"],
    ["99999999999999999999", "VND"],
    ["12.345", "USD"], // three digits after the point is a thousands group: 12345.00
  ] as const)("rejects %s %s", (text, currency) => {
    const v = parseAmountText(text, currency);
    if (text === "12.345") expect(v).toBe(1_234_500);
    else expect(v).toBeNull();
  });
});

describe("createUserProduct", () => {
  it("builds an unverified record, cleaned and stamped", () => {
    const r = createUserProduct(draft(), ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.product).toEqual({
      id: "user-3f2b8c1e-aaaa-4bbb-8ccc-0123456789ab",
      title: "Tai nghe thử",
      sourceUrl: "https://shop.example/p/1?color=red",
      attributes: { Màu: "Đen" },
      price: { amountMinor: 1_290_000, currency: "VND" },
      unverified: true,
      createdAtMs: ctx.nowMs,
    });
    expect(r.removedParams).toEqual(["utm_source"]);
    expect(userOfferId(r.product.id)).toBe("user-3f2b8c1e-aaaa-4bbb-8ccc-0123456789ab@user");
  });

  it("keeps an unknown price as null, never zero", () => {
    const r = createUserProduct(draft({ priceText: "  " }), ctx);
    expect(r.ok && r.product.price).toBeNull();
  });

  it.each([
    ["javascript:alert(1)", "url_unsupported_scheme"],
    ["data:text/html,<script>1</script>", "url_unsupported_scheme"],
    ["file:///etc/passwd", "url_unsupported_scheme"],
    ["https://user:pw@shop.example/", "url_has_credentials"],
    ["not a url", "url_invalid"],
    ["", "url_empty"],
    [`https://shop.example/${"a".repeat(2100)}`, "url_too_long"],
  ] as const)("rejects the link %s", (sourceUrl, issue) => {
    const r = createUserProduct(draft({ sourceUrl }), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues).toContainEqual({ field: "sourceUrl", issue });
  });

  it("reports every problem at once, by field", () => {
    const r = createUserProduct(
      draft({
        title: " ",
        priceText: "abc",
        currency: "XXX",
        attributes: [
          { name: "a", value: "" },
          { name: "b", value: "1" },
          { name: "b", value: "2" },
        ],
      }),
      ctx,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const got = r.issues.map((i) => `${i.field}:${i.issue}`);
    expect(got).toContain("title:title_required");
    expect(got).toContain("currency:currency_unsupported");
    expect(got).toContain("attributes:attribute_incomplete");
    expect(got).toContain("attributes:attribute_duplicate");
    expect(got).not.toContain("price:price_invalid"); // an unknown currency hides the price check, not the reverse
  });

  it("rejects an invalid price for a known currency", () => {
    const r = createUserProduct(draft({ priceText: "12.34" }), ctx);
    expect(!r.ok && r.issues).toContainEqual({ field: "price", issue: "price_invalid" });
  });

  it("limits titles, attribute counts and attribute lengths", () => {
    const long = createUserProduct(draft({ title: "x".repeat(201) }), ctx);
    expect(!long.ok && long.issues).toContainEqual({ field: "title", issue: "title_too_long" });
    const many = createUserProduct(
      draft({ attributes: Array.from({ length: 7 }, (_, i) => ({ name: `n${i}`, value: "v" })) }),
      ctx,
    );
    expect(!many.ok && many.issues).toContainEqual({
      field: "attributes",
      issue: "too_many_attributes",
    });
    const wide = createUserProduct(
      draft({ attributes: [{ name: "n".repeat(41), value: "v" }] }),
      ctx,
    );
    expect(!wide.ok && wide.issues).toContainEqual({
      field: "attributes",
      issue: "attribute_too_long",
    });
  });

  it("ignores fully blank attribute rows and refuses names that collide with object internals", () => {
    const blank = createUserProduct(draft({ attributes: [{ name: "", value: "" }] }), ctx);
    expect(blank.ok && blank.product.attributes).toEqual({});
    for (const name of ["__proto__", "constructor", "prototype"]) {
      const r = createUserProduct(draft({ attributes: [{ name, value: "x" }] }), ctx);
      expect(!r.ok && r.issues).toContainEqual({
        field: "attributes",
        issue: "attribute_reserved",
      });
    }
  });
});
