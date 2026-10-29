import { describe, expect, it } from "vitest";
import { validateCatalog } from "../domain/catalog-data";
import type { Source } from "../domain/catalog-schema";
import { CURATION_COLUMNS, importCuration, parseCsv, suggestSlug } from "./curation-csv";

/** Obviously fictional rows ("Acme", .test hosts): they exercise the converter, they are not catalog data. */
const sources: Source[] = [
  {
    id: "acme-shop",
    name: "Acme Shop",
    domain: "shop.acme.test",
    kind: "retailer",
    termsReviewedAt: "2026-11-01",
    persistencePolicy: "snapshot_allowed",
  },
];
const base: Record<string, string> = {
  product_id: "acme-book",
  brand: "Acme",
  family: "Book",
  model: "14",
  category: "laptop",
  screen_in: "14",
  chip: "m1",
  ram_gb: "8",
  storage_gb: "256",
  offer_merchant: "Acme Shop",
  offer_url: "https://shop.acme.test/book-14",
  offer_currency: "VND",
  price_amount_minor: "20000000",
  price_observed_at: "2026-11-25",
  price_observer: "curator-1",
  price_provenance_type: "curator_observed",
  price_evidence_note: "price shown on the product page",
  availability: "unknown",
  title_vi: "Acme Book 14",
  summary_vi: "Mô tả tự viết",
  verified_by: "second-checker",
  verified_at: "2026-11-26",
};
const csvEscape = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const toCsv = (rows: Record<string, string>[], columns: readonly string[] = CURATION_COLUMNS) =>
  [columns.join(","), ...rows.map((r) => columns.map((c) => csvEscape(r[c] ?? "")).join(","))].join(
    "\n",
  );
const errorsOf = (rows: Record<string, string>[], columns?: readonly string[]) =>
  importCuration(toCsv(rows, columns), sources).errors.map(
    (e) => `${e.line}:${e.column ?? "-"}:${e.message}`,
  );

describe("parseCsv", () => {
  it("handles quotes, doubled quotes, embedded commas and newlines, CRLF and a BOM", () => {
    const { rows, error } = parseCsv('﻿a,b\r\n"x,1","he said ""hi"""\r\n"line1\nline2",z');
    expect(error).toBeNull();
    expect(rows).toEqual([
      ["a", "b"],
      ["x,1", 'he said "hi"'],
      ["line1\nline2", "z"],
    ]);
  });
  it("reports an unclosed quote instead of swallowing the file", () => {
    expect(parseCsv('a,b\n"oops,1').error).toMatch(/never closed/);
  });
});

describe("a well-formed curation file", () => {
  it("converts to records that pass catalog validation", () => {
    const result = importCuration(
      toCsv([
        base,
        {
          ...base,
          ram_gb: "16",
          storage_gb: "512",
          price_amount_minor: "26000000",
          image_file: "media/acme-book/front.avif",
          image_alt_vi: "Mặt trước",
          image_width: "1200",
          image_height: "800",
          image_rights_status: "PENDING",
        },
      ]),
      sources,
    );
    expect(result.errors).toEqual([]);
    expect(result.products.map((p) => [p.id, p.verificationStatus, p.createdAt])).toEqual([
      ["acme-book", "verified", "2026-11-26T00:00:00.000Z"],
    ]);
    expect(result.variants.map((v) => [v.id, v.variantKey])).toEqual([
      ["acme-book:14-m1-16-512", "screen_in=14;chip=m1;ram_gb=16;storage_gb=512"],
      ["acme-book:14-m1-8-256", "screen_in=14;chip=m1;ram_gb=8;storage_gb=256"],
    ]);
    expect(result.offers[0]).toMatchObject({
      id: "acme-book:14-m1-16-512@acme-shop",
      sourceId: "acme-shop",
      price: {
        amountMinor: 26_000_000,
        currency: "VND",
        observedAt: "2026-11-25T00:00:00.000Z",
        observer: "curator-1",
      },
    });
    expect(result.media).toHaveLength(1);
    const validation = validateCatalog(
      {
        sources,
        products: result.products,
        variants: result.variants,
        offers: result.offers,
        media: result.media,
        vocabulary: { chip: { m1: { labelVi: "Chip M1", aliases: ["m1"] } } },
        featured: [],
      },
      { mode: "real", nowMs: Date.parse("2026-11-30T00:00:00Z") },
    );
    expect(validation.errors).toEqual([]);
  });
  it("a variant-only row (no offer) is allowed and an offer without a price keeps the price null", () => {
    const result = importCuration(
      toCsv([
        {
          ...base,
          price_amount_minor: "",
          price_observed_at: "",
          price_observer: "",
          price_provenance_type: "",
          price_evidence_note: "",
        },
        {
          ...base,
          ram_gb: "16",
          offer_url: "",
          offer_merchant: "",
          price_amount_minor: "",
          price_observed_at: "",
        },
      ]),
      sources,
    );
    expect(result.errors).toEqual([]);
    expect(result.offers).toHaveLength(1);
    expect(result.offers[0]!.price).toBeNull();
  });
  it("is deterministic: output is sorted by id whatever the row order", () => {
    const rows = [{ ...base, ram_gb: "16" }, base];
    expect(importCuration(toCsv(rows), sources)).toEqual(
      importCuration(toCsv([...rows].reverse()), sources),
    );
  });
  it("an unverified row stays needs_review (the real-catalog validator will refuse to ship it)", () => {
    const r = importCuration(toCsv([{ ...base, verified_by: "", verified_at: "" }]), sources);
    expect(r.products[0]!.verificationStatus).toBe("needs_review");
  });
});

describe("rejects malformed files with the row, column and a fix", () => {
  it("header problems", () => {
    expect(
      errorsOf(
        [base],
        CURATION_COLUMNS.filter((c) => c !== "brand"),
      ),
    ).toContain('1:brand:missing column "brand"');
    expect(errorsOf([base], [...CURATION_COLUMNS, "extra"])).toContain(
      '1:extra:unknown column "extra"',
    );
    expect(importCuration("", sources).errors[0]!.message).toBe("the file is empty");
  });
  it("wrong number of cells", () => {
    const r = importCuration(`${CURATION_COLUMNS.join(",")}\nacme-book,Acme`, sources);
    expect(r.errors[0]).toMatchObject({ line: 2 });
    expect(r.errors[0]!.message).toMatch(/expected 39 columns/);
  });
  it.each([
    [
      "a price with separators",
      { price_amount_minor: "29.990.000đ" },
      "price_amount_minor",
      /whole positive amount/,
    ],
    [
      "a price in scientific notation",
      { price_amount_minor: "1e6" },
      "price_amount_minor",
      /whole positive amount/,
    ],
    [
      "a hexadecimal price",
      { price_amount_minor: "0x10" },
      "price_amount_minor",
      /whole positive amount/,
    ],
    ["a zero price", { price_amount_minor: "0" }, "price_amount_minor", /whole positive amount/],
    [
      "a price without an observation date",
      { price_observed_at: "" },
      "price_observed_at",
      /ISO date/,
    ],
    ["a lowercase currency", { offer_currency: "vnd" }, "offer_currency", /uppercase/],
    [
      "user-entered provenance",
      { price_provenance_type: "user_entered" },
      "price_provenance_type",
      /curator_observed or manufacturer_listed/,
    ],
    ["an unknown category", { category: "toaster" }, "category", /must be one of/],
    ["a non-numeric RAM", { ram_gb: "8GB" }, "ram_gb", /not a number/],
    ["a color that is not a slug", { color: "Titan Tự Nhiên" }, "color", /titan_tu_nhien/],
    [
      "an attribute the category does not have",
      { category: "phone", screen_in: "6" },
      "screen_in",
      /not an attribute of phone/,
    ],
    ["a variant_key that disagrees", { variant_key: "nope" }, "variant_key", /does not match/],
    ["a bad gtin", { gtin: "12" }, "gtin", /8 to 14 digits/],
    [
      "an unsafe offer link",
      { offer_url: "javascript:alert(1)" },
      "offer_url",
      /safe http\(s\) URL/,
    ],
    [
      "a host with no source record",
      { offer_url: "https://unknown.example/x" },
      "offer_url",
      /no source record for "unknown\.example"/,
    ],
    ["an offer link without a merchant", { offer_merchant: "" }, "offer_merchant", /required/],
    ["a half-filled second check", { verified_at: "" }, "verified_by", /both be filled/],
    ["a bad verification date", { verified_at: "26/11/2026" }, "verified_at", /not an ISO date/],
    [
      "an image without dimensions",
      { image_file: "media/a.avif", image_alt_vi: "x", image_rights_status: "PENDING" },
      "image_width",
      /positive whole number/,
    ],
    [
      "an image with an unknown rights status",
      {
        image_file: "media/a.avif",
        image_alt_vi: "x",
        image_width: "1",
        image_height: "1",
        image_rights_status: "MAYBE",
      },
      "image_rights_status",
      /CLEARED, PENDING or NOT_CLEARED/,
    ],
  ])("%s", (_n, change, column, message) => {
    const errors = importCuration(toCsv([{ ...base, ...change }]), sources).errors;
    const hit = errors.find((e) => e.column === column);
    expect(hit, JSON.stringify(errors)).toBeDefined();
    expect(hit!.line).toBe(2);
    expect(hit!.message).toMatch(message);
  });
  it("conflicting product details across rows and a duplicate offer", () => {
    expect(errorsOf([base, { ...base, ram_gb: "16", brand: "Other" }]).join()).toMatch(
      /conflicting brand/,
    );
    expect(errorsOf([base, base]).join()).toMatch(/already has an offer from source "acme-shop"/);
  });
  it("a price on a row with no offer link", () => {
    expect(errorsOf([{ ...base, offer_url: "" }]).join()).toMatch(/needs the offer link/);
  });
  it("returns no records when anything is wrong (nothing is partially converted for the build)", () => {
    const r = importCuration(toCsv([base, { ...base, ram_gb: "x" }]), sources);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe("suggestSlug", () => {
  it("turns Vietnamese display text into a slug", () => {
    expect(suggestSlug("Titan Tự Nhiên")).toBe("titan_tu_nhien");
    expect(suggestSlug("  Đen  ")).toBe("den");
  });
});
