import { z } from "zod";

/**
 * ISO 4217 minor-unit exponents for the currencies a source may quote. VND has exponent 0, so
 * 1,000,000 VND is stored as `1000000`. A currency missing from this table is not representable
 * (it is rejected, not guessed). Checkout supports VND only (ADR-013).
 */
export const CURRENCY_EXPONENTS = {
  VND: 0,
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  KRW: 0,
  CNY: 2,
  SGD: 2,
  THB: 2,
} as const satisfies Record<string, number>;

export type CurrencyCode = keyof typeof CURRENCY_EXPONENTS;
export const CHECKOUT_CURRENCY = "VND" satisfies CurrencyCode;

const currencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/)
  .refine((c): c is CurrencyCode => c in CURRENCY_EXPONENTS, "unsupported currency");

/** Integer minor units. Unknown amounts are `null` elsewhere, never `0`. */
export const amountMinorSchema = z.number().int().safe().min(1);

export const moneySchema = z.strictObject({
  amountMinor: amountMinorSchema,
  currency: currencyCodeSchema,
});
export type Money = z.infer<typeof moneySchema>;

export function isValidMoney(record: { amountMinor: number; currency: string }): boolean {
  return moneySchema.safeParse(record).success;
}

export function currencyExponent(currency: CurrencyCode): number {
  return CURRENCY_EXPONENTS[currency];
}

/**
 * Multiply an integer amount by an integer quantity, failing loudly instead of losing precision.
 * Prices and subtotals are integers; a result outside the safe range is a bug or hostile input.
 */
export function multiplyMinor(amountMinor: number, quantity: number): number {
  const product = amountMinor * quantity;
  if (
    !Number.isSafeInteger(amountMinor) ||
    !Number.isSafeInteger(quantity) ||
    !Number.isSafeInteger(product)
  ) {
    throw new RangeError(`Amount overflow: ${amountMinor} × ${quantity}`);
  }
  return product;
}

export function addMinor(a: number, b: number): number {
  const sum = a + b;
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || !Number.isSafeInteger(sum)) {
    throw new RangeError(`Amount overflow: ${a} + ${b}`);
  }
  return sum;
}
