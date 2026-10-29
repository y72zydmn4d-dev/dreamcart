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
