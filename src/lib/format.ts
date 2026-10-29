import { CURRENCY_EXPONENTS, type CurrencyCode } from "@/modules/shared/domain/money";

const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/** Format integer VND minor units (exponent 0) for display, for example "24.990.000 ₫". */
export function formatVnd(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError(`Invalid VND amount: ${amountMinor}`);
  }
  return vnd.format(amountMinor);
}

/**
 * Format an amount in its own currency, never converting. Minor units follow the ISO 4217 exponent table
 * (VND 0, USD 2). A currency we have no exponent for is rejected rather than guessed.
 */
export function formatMoney(amountMinor: number, currency: string): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError(`Invalid amount: ${amountMinor}`);
  }
  if (currency === "VND") return formatVnd(amountMinor);
  if (!(currency in CURRENCY_EXPONENTS)) throw new RangeError(`Unsupported currency: ${currency}`);
  const exponent = CURRENCY_EXPONENTS[currency as CurrencyCode];
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(amountMinor / 10 ** exponent);
}

const date = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** A calendar date such as "20/10/2026" from an ISO timestamp. UTC, so server and browser always agree. */
export function formatDateVi(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new RangeError(`Invalid date: ${iso}`);
  return date.format(ms);
}
