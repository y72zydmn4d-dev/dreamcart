import { describe, expect, it } from "vitest";
import { formatDateVi, formatMoney, formatVnd } from "./format";

describe("formatVnd", () => {
  it("formats integer VND with vi-VN grouping and the dong sign", () => {
    expect(formatVnd(24_990_000).replace(/\s/g, " ")).toBe("24.990.000 ₫");
    expect(formatVnd(0).replace(/\s/g, " ")).toBe("0 ₫");
  });

  it("rejects fractional, negative and unsafe amounts", () => {
    expect(() => formatVnd(1.5)).toThrow(RangeError);
    expect(() => formatVnd(-1)).toThrow(RangeError);
    expect(() => formatVnd(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
    expect(() => formatVnd(Number.NaN)).toThrow(RangeError);
  });
});

describe("formatMoney", () => {
  it("keeps each currency in its own units and never converts", () => {
    expect(formatMoney(1999, "USD").replace(/\s/g, " ")).toBe("19,99 US$");
    expect(formatMoney(29_990_000, "VND").replace(/\s/g, " ")).toBe("29.990.000 ₫");
  });
  it("rejects currencies without a known exponent and invalid amounts", () => {
    expect(() => formatMoney(1, "XXX")).toThrow(RangeError);
    expect(() => formatMoney(-1, "VND")).toThrow(RangeError);
  });
});

describe("formatDateVi", () => {
  it("formats a UTC calendar date", () => {
    expect(formatDateVi("2026-10-20T23:59:59Z")).toBe("20/10/2026");
    expect(() => formatDateVi("nope")).toThrow(RangeError);
  });
});
