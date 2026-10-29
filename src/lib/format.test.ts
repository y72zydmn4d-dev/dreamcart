import { describe, expect, it } from "vitest";
import { formatVnd } from "./format";

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
