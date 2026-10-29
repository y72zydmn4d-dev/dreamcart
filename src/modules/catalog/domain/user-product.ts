import {
  currencyExponent,
  CURRENCY_EXPONENTS,
  type CurrencyCode,
} from "@/modules/shared/domain/money";
import { parseSafeUrl, type SafeUrl } from "@/modules/shared/domain/safe-url";
import { userProductSchema, type UserProduct } from "./catalog-schema";

/**
 * Manual import (ADR-003): the user pastes a link and types what they know. Nothing is fetched. Every field is the
 * user's own claim and the result is always `unverified`. This module only validates and builds the record.
 */

export const MAX_USER_ATTRIBUTES = 6;
export const MAX_USER_PRODUCTS = 500;
/** Names that would collide with object internals; refused so a record can never carry them. */
const RESERVED_ATTRIBUTE_NAMES = new Set(["__proto__", "constructor", "prototype"]);

export interface UserProductDraft {
  readonly title: string;
  readonly sourceUrl: string;
  /** Free text such as "24.990.000" or "1,299.99"; empty means "I do not know the price". */
  readonly priceText: string;
  readonly currency: string;
  readonly attributes: readonly { readonly name: string; readonly value: string }[];
}

export type UserProductField = "title" | "sourceUrl" | "price" | "currency" | "attributes";

export type UserProductIssue =
  | "title_required"
  | "title_too_long"
  | "url_empty"
  | "url_too_long"
  | "url_invalid"
  | "url_unsupported_scheme"
  | "url_has_credentials"
  | "price_invalid"
  | "price_too_large"
  | "currency_unsupported"
  | "attribute_incomplete"
  | "attribute_duplicate"
  | "attribute_too_long"
  | "attribute_reserved"
  | "too_many_attributes";

export interface UserProductProblem {
  readonly field: UserProductField;
  readonly issue: UserProductIssue;
}

export type UserProductResult =
  | {
      readonly ok: true;
      readonly product: UserProduct;
      /** Tracking parameters that were removed from the link, so the UI can say so. */
      readonly removedParams: readonly string[];
    }
  | {
      readonly ok: false;
      readonly issues: readonly {
        readonly field: UserProductField;
        readonly issue: UserProductIssue;
      }[];
    };

const URL_ISSUES = {
  empty: "url_empty",
  too_long: "url_too_long",
  invalid: "url_invalid",
  unsupported_scheme: "url_unsupported_scheme",
  has_credentials: "url_has_credentials",
} as const satisfies Record<string, UserProductIssue>;

/**
 * Read a typed amount into integer minor units, or null when it is not a clean amount. Separators are decided by
 * the currency's exponent: for a currency with no minor unit (VND, JPY, KRW) every `.`, `,` and space is a
 * thousands separator and must sit in groups of three; for others the last `.` or `,` is the decimal point when it
 * is followed by 1..exponent digits and everything before it is grouped by thousands. Anything ambiguous or with
 * other characters is rejected, never guessed.
 */
export function parseAmountText(text: string, currency: CurrencyCode): number | null {
  const raw = text.trim().replace(/[\s ]/g, "");
  if (raw === "" || !/^[0-9.,]+$/.test(raw)) return null;
  const exponent = currencyExponent(currency);
  let integerPart = raw;
  let fraction = "";
  if (exponent > 0) {
    const match = /^(.*)[.,]([0-9]{1,2})$/.exec(raw);
    if (match && match[2]!.length <= exponent) {
      integerPart = match[1]!;
      fraction = match[2]!;
    }
  }
  const groups = integerPart.split(/[.,]/);
  const grouped = groups.length > 1;
  if (grouped && (groups[0]!.length < 1 || groups[0]!.length > 3)) return null;
  if (grouped && groups.slice(1).some((g) => g.length !== 3)) return null;
  if (groups.some((g) => !/^[0-9]+$/.test(g))) return null;
  const digits = groups.join("") + fraction.padEnd(exponent, "0");
  const amount = Number(digits);
  if (!Number.isSafeInteger(amount) || amount < 1) return null;
  return amount;
}

const slugOf = (uuid: string): string =>
  uuid
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 36);

export const userOfferId = (productId: string): string => `${productId}@user`;

/** Validate a draft and build the record. Pure: the caller supplies the time and a fresh UUID. */
export function createUserProduct(
  draft: UserProductDraft,
  context: { readonly nowMs: number; readonly uuid: string },
): UserProductResult {
  const issues: { field: UserProductField; issue: UserProductIssue }[] = [];

  const title = draft.title.trim().replace(/\s+/g, " ");
  if (title === "") issues.push({ field: "title", issue: "title_required" });
  else if (title.length > 200) issues.push({ field: "title", issue: "title_too_long" });

  const url = parseSafeUrl(draft.sourceUrl);
  if (!url.ok) issues.push({ field: "sourceUrl", issue: URL_ISSUES[url.reason] });

  let price: UserProduct["price"] = null;
  const currencyKnown = draft.currency in CURRENCY_EXPONENTS;
  if (!currencyKnown) issues.push({ field: "currency", issue: "currency_unsupported" });
  if (draft.priceText.trim() !== "" && currencyKnown) {
    const currency = draft.currency as CurrencyCode;
    const amountMinor = parseAmountText(draft.priceText, currency);
    if (amountMinor === null) issues.push({ field: "price", issue: "price_invalid" });
    else price = { amountMinor, currency };
  }

  const attributes: Record<string, string> = {};
  const rows = draft.attributes.filter((a) => a.name.trim() !== "" || a.value.trim() !== "");
  if (rows.length > MAX_USER_ATTRIBUTES) {
    issues.push({ field: "attributes", issue: "too_many_attributes" });
  } else {
    for (const row of rows) {
      const name = row.name.trim().replace(/\s+/g, " ");
      const value = row.value.trim().replace(/\s+/g, " ");
      if (name === "" || value === "") {
        issues.push({ field: "attributes", issue: "attribute_incomplete" });
      } else if (RESERVED_ATTRIBUTE_NAMES.has(name)) {
        issues.push({ field: "attributes", issue: "attribute_reserved" });
      } else if (name.length > 40 || value.length > 80) {
        issues.push({ field: "attributes", issue: "attribute_too_long" });
      } else if (Object.hasOwn(attributes, name)) {
        issues.push({ field: "attributes", issue: "attribute_duplicate" });
      } else {
        attributes[name] = value;
      }
    }
  }

  if (issues.length > 0 || !url.ok) return { ok: false, issues };

  const candidate: UserProduct = {
    id: `user-${slugOf(context.uuid)}`,
    title,
    sourceUrl: url.url satisfies SafeUrl,
    attributes,
    price,
    unverified: true,
    createdAtMs: context.nowMs,
  };
  const parsed = userProductSchema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, issues: [{ field: "title", issue: "title_required" }] };
  }
  return { ok: true, product: parsed.data, removedParams: url.removedParams };
}
