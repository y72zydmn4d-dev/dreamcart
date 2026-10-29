import { describe, expect, it } from "vitest";
import {
  addMinor,
  CURRENCY_EXPONENTS,
  currencyExponent,
  isValidMoney,
  multiplyMinor,
} from "./money";
import { fixedClock, isoToMs } from "./ports";

describe("money", () => {
  it("VND has exponent 0 and USD has 2", () => {
    expect(currencyExponent("VND")).toBe(0);
    expect(currencyExponent("USD")).toBe(2);
    expect(Object.values(CURRENCY_EXPONENTS).every((e) => Number.isInteger(e) && e >= 0)).toBe(
      true,
    );
  });
  it("rejects currencies it does not know instead of guessing an exponent", () => {
    expect(isValidMoney({ amountMinor: 100, currency: "XXX" })).toBe(false);
    expect(isValidMoney({ amountMinor: 100, currency: "VND" })).toBe(true);
  });
  it("multiplies and adds integers exactly", () => {
    expect(multiplyMinor(29_990_000, 99)).toBe(2_969_010_000);
    expect(addMinor(1, 2)).toBe(3);
  });
  it("throws rather than lose precision", () => {
    expect(() => multiplyMinor(Number.MAX_SAFE_INTEGER, 2)).toThrow(RangeError);
    expect(() => multiplyMinor(1.5, 2)).toThrow(RangeError);
    expect(() => addMinor(Number.MAX_SAFE_INTEGER, 1)).toThrow(RangeError);
  });
});

describe("injected time", () => {
  it("fixedClock always reports the same instant", () => {
    const clock = fixedClock(42);
    expect([clock.nowMs(), clock.nowMs()]).toEqual([42, 42]);
  });
  it("isoToMs parses ISO text and rejects garbage", () => {
    expect(isoToMs("1970-01-01T00:00:01Z")).toBe(1000);
    expect(() => isoToMs("not a date")).toThrow(RangeError);
  });
});
