import { describe, expect, it } from "vitest";
import { normalizeText, tokenize } from "./text";

describe("normalizeText", () => {
  it("makes Vietnamese diacritics and đ insensitive", () => {
    expect(normalizeText("Điện thoại")).toBe("dien thoai");
    expect(normalizeText("TAI NGHE  không dây")).toBe("tai nghe khong day");
  });

  it("collapses and trims whitespace", () => {
    expect(normalizeText("  Bộ \t nhớ\n ")).toBe("bo nho");
  });
});

describe("tokenize", () => {
  it("splits on non-alphanumerics and drops empties", () => {
    expect(tokenize("Laptop 15-inch, 16GB!")).toEqual(["laptop", "15", "inch", "16gb"]);
    expect(tokenize("  --  ")).toEqual([]);
  });
});
