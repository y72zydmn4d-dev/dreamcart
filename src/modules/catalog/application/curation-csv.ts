import { parseSafeUrl } from "@/modules/shared/domain/safe-url";
import {
  CATEGORIES,
  deriveVariantKey,
  OPTIONAL_ATTRIBUTES,
  REQUIRED_ATTRIBUTES,
  type Category,
  type MediaAsset,
  type Offer,
  type Product,
  type Source,
  type Variant,
} from "../domain/catalog-schema";
import { NUMERIC_ATTRIBUTES, SLUG_ATTRIBUTES } from "../domain/catalog-data";

/**
 * Curation CSV -> catalog records (docs/CURATION_PROCESS.md, `docs/templates/catalog_curation_template.csv`).
 * One row per variant-offer. The converter never guesses: a malformed or missing value is an error with the row
 * and column, nothing is defaulted, and nothing is written unless every row converts. Source terms live in
 * `sources.json` (hand-maintained); each offer row must resolve to a source by its URL host.
 */
export const CURATION_COLUMNS = [
  "product_id",
  "brand",
  "family",
  "model",
  "category",
  "variant_key",
  "screen_in",
  "chip",
  "ram_gb",
  "storage_gb",
  "type",
  "color",
  "gtin",
  "offer_merchant",
  "offer_url",
  "offer_currency",
  "price_amount_minor",
  "price_observed_at",
  "price_observer",
  "price_provenance_type",
  "price_evidence_note",
  "availability",
  "image_file",
  "image_alt_vi",
  "image_width",
  "image_height",
  "image_source_page_url",
  "image_rights_basis",
  "image_license_id",
  "image_license_url",
  "image_creator",
  "image_attribution",
  "image_rights_evidence",
  "image_rights_status",
  "title_vi",
  "summary_vi",
  "verified_by",
  "verified_at",
  "notes",
] as const;
type Column = (typeof CURATION_COLUMNS)[number];

export interface ImportError {
  /** 1-based line of the CSV (the header is line 1); 0 for file-level problems. */
  readonly line: number;
  readonly column?: string;
  readonly message: string;
}

export interface CurationImport {
  readonly ok: boolean;
  readonly errors: readonly ImportError[];
  readonly products: Product[];
  readonly variants: Variant[];
  readonly offers: Offer[];
  readonly media: MediaAsset[];
}

/** RFC 4180-style parser: quoted fields, doubled quotes, newlines inside quotes, CRLF, BOM. */
export function parseCsv(text: string): { rows: string[][]; error: string | null } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"' && field === "") inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (inQuotes) return { rows, error: "a quoted field is never closed" };
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return { rows, error: null };
}

const SLUG = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
export const suggestSlug = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const slugPart = (value: string | number) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "_");

export function importCuration(csv: string, sources: readonly Source[]): CurationImport {
  const errors: ImportError[] = [];
  const empty = (): CurationImport => ({
    ok: false,
    errors,
    products: [],
    variants: [],
    offers: [],
    media: [],
  });
  const parsed = parseCsv(csv);
  if (parsed.error) {
    errors.push({ line: 0, message: parsed.error });
    return empty();
  }
  const [header, ...body] = parsed.rows;
  if (!header) {
    errors.push({ line: 0, message: "the file is empty" });
    return empty();
  }
  const names = header.map((h) => h.trim());
  const known = new Set<string>(CURATION_COLUMNS);
  for (const n of names)
    if (!known.has(n)) errors.push({ line: 1, column: n, message: `unknown column "${n}"` });
  for (const required of CURATION_COLUMNS)
    if (!names.includes(required))
      errors.push({ line: 1, column: required, message: `missing column "${required}"` });
  if (new Set(names).size !== names.length)
    errors.push({ line: 1, message: "duplicate column names" });
  if (errors.length > 0) return empty();
  const at = Object.fromEntries(names.map((n, i) => [n, i])) as Record<Column, number>;

  const products = new Map<string, Product>();
  const variants = new Map<string, Variant>();
  const offers = new Map<string, Offer>();
  const media = new Map<string, MediaAsset>();
  const mediaCount = new Map<string, number>();
  const sourceByHost = (host: string) =>
    sources.find((s) => host === s.domain || host.endsWith(`.${s.domain}`));

  body.forEach((cells, i) => {
    const line = i + 2;
    if (cells.every((c) => c.trim() === "")) return;
    const fail = (column: string, message: string) => errors.push({ line, column, message });
    if (cells.length !== names.length) {
      errors.push({ line, message: `expected ${names.length} columns but found ${cells.length}` });
      return;
    }
    const get = (c: Column) => (cells[at[c]] ?? "").trim();

    // Product identity (all rows of a product must agree).
    const productId = get("product_id");
    const category = get("category") as Category;
    if (!productId) return fail("product_id", "product_id is required");
    if (!(CATEGORIES as readonly string[]).includes(category))
      return fail("category", `category must be one of ${CATEGORIES.join(", ")}`);
    const verifiedBy = get("verified_by");
    const verifiedAt = get("verified_at");
    if (Boolean(verifiedBy) !== Boolean(verifiedAt))
      fail(
        "verified_by",
        "verified_by and verified_at must both be filled (second check) or both empty",
      );
    let createdAt = "";
    if (verifiedAt) {
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(verifiedAt) ? `${verifiedAt}T00:00:00Z` : verifiedAt;
      if (Number.isNaN(Date.parse(iso))) fail("verified_at", `"${verifiedAt}" is not an ISO date`);
      else createdAt = new Date(iso).toISOString();
    }
    const product: Product = {
      id: productId,
      brand: get("brand"),
      family: get("family"),
      model: get("model"),
      category,
      titleVi: get("title_vi"),
      summaryVi: get("summary_vi"),
      verificationStatus: verifiedBy && verifiedAt ? "verified" : "needs_review",
      createdAt: createdAt || "1970-01-01T00:00:00.000Z",
    };
    const seen = products.get(productId);
    if (!seen) products.set(productId, product);
    else {
      for (const key of [
        "brand",
        "family",
        "model",
        "category",
        "titleVi",
        "summaryVi",
        "verificationStatus",
      ] as const) {
        if (seen[key] !== product[key])
          fail(key, `product "${productId}" has conflicting ${key} on different rows`);
      }
    }

    // Variant attributes.
    const allowed = new Set<string>([
      ...REQUIRED_ATTRIBUTES[category],
      ...OPTIONAL_ATTRIBUTES[category],
    ]);
    const attributes: Record<string, string | number> = {};
    for (const key of [...NUMERIC_ATTRIBUTES, ...SLUG_ATTRIBUTES]) {
      const raw = get(key as Column);
      if (!raw) continue;
      if (!allowed.has(key)) {
        fail(key, `"${key}" is not an attribute of ${category}; leave it empty`);
        continue;
      }
      if ((NUMERIC_ATTRIBUTES as readonly string[]).includes(key)) {
        if (!/^\d+(\.\d+)?$/.test(raw))
          fail(key, `"${raw}" is not a number (use a dot for decimals, no units)`);
        else attributes[key] = Number(raw);
      } else if (!SLUG.test(raw))
        fail(key, `"${raw}" must be a lowercase slug such as "${suggestSlug(raw) || "value"}"`);
      else attributes[key] = raw;
    }
    const keyParts = [...REQUIRED_ATTRIBUTES[category], ...OPTIONAL_ATTRIBUTES[category]]
      .map((k) => attributes[k])
      .filter((v) => v !== undefined)
      .map(slugPart);
    const variantId = `${productId}:${keyParts.join("-")}`;
    const variantKey = deriveVariantKey(category, attributes);
    if (get("variant_key") && get("variant_key") !== variantKey) {
      fail(
        "variant_key",
        `variant_key "${get("variant_key")}" does not match the attributes (expected "${variantKey}"); leave it empty to derive it`,
      );
    }
    const gtin = get("gtin");
    if (gtin && !/^\d{8,14}$/.test(gtin)) fail("gtin", "gtin must be 8 to 14 digits");
    if (!variants.has(variantId))
      variants.set(variantId, {
        id: variantId,
        productId,
        attributes,
        gtin: gtin || null,
        variantKey,
      });

    // Offer (optional: a row may describe only a variant).
    const offerUrl = get("offer_url");
    if (offerUrl) {
      const url = parseSafeUrl(offerUrl);
      if (!url.ok) return fail("offer_url", `offer link is not a safe http(s) URL (${url.reason})`);
      const host = new URL(url.url).hostname.toLowerCase();
      const source = sourceByHost(host);
      if (!source)
        return fail(
          "offer_url",
          `no source record for "${host}": add it to sources.json (with its terms review) first`,
        );
      const merchant = get("offer_merchant");
      if (!merchant) fail("offer_merchant", "offer_merchant is required with an offer link");
      const availability = get("availability") || "unknown";
      if (!["in_stock", "out_of_stock", "unknown"].includes(availability))
        fail("availability", "availability must be in_stock, out_of_stock or unknown");

      let price: Offer["price"] = null;
      const amount = get("price_amount_minor");
      if (amount) {
        if (!/^\d+$/.test(amount) || !Number.isSafeInteger(Number(amount)) || Number(amount) < 1) {
          fail(
            "price_amount_minor",
            `"${amount}" is not a whole positive amount; enter VND without separators or symbols (for example 29990000)`,
          );
        } else {
          const observed = get("price_observed_at");
          const iso = /^\d{4}-\d{2}-\d{2}$/.test(observed) ? `${observed}T00:00:00Z` : observed;
          if (!observed || Number.isNaN(Date.parse(iso)))
            fail("price_observed_at", "price_observed_at must be an ISO date or date-time");
          const currency = get("offer_currency");
          if (!/^[A-Z]{3}$/.test(currency))
            fail("offer_currency", "offer_currency must be an uppercase ISO 4217 code such as VND");
          const provenance = get("price_provenance_type");
          if (!["curator_observed", "manufacturer_listed"].includes(provenance))
            fail(
              "price_provenance_type",
              "price_provenance_type must be curator_observed or manufacturer_listed",
            );
          const evidenceNote = get("price_evidence_note");
          price = {
            amountMinor: Number(amount),
            currency: currency as "VND",
            observedAt: Number.isNaN(Date.parse(iso)) ? iso : new Date(iso).toISOString(),
            provenanceType: provenance as "curator_observed",
            ...(get("price_observer") ? { observer: get("price_observer") } : {}),
            ...(evidenceNote ? { evidenceNote } : {}),
          };
        }
      }
      const offerId = `${variantId}@${source.id}`;
      if (offers.has(offerId))
        fail("offer_url", `variant "${variantId}" already has an offer from source "${source.id}"`);
      else
        offers.set(offerId, {
          id: offerId,
          variantId,
          sourceId: source.id,
          url: url.url,
          merchantName: merchant,
          availability: availability as Offer["availability"],
          price,
        });
    } else if (get("price_amount_minor"))
      fail("offer_url", "a price needs the offer link it was observed on");

    // Image (optional): rights are recorded with the file, never assumed.
    const file = get("image_file");
    if (file) {
      const dimension = (c: Column) =>
        /^\d+$/.test(get(c)) && Number(get(c)) > 0 ? Number(get(c)) : null;
      const width = dimension("image_width");
      const height = dimension("image_height");
      if (!width) fail("image_width", "image_width must be a positive whole number (pixels)");
      if (!height) fail("image_height", "image_height must be a positive whole number (pixels)");
      if (!get("image_alt_vi"))
        fail("image_alt_vi", "image_alt_vi (Vietnamese alt text) is required");
      const status = get("image_rights_status");
      if (!["CLEARED", "PENDING", "NOT_CLEARED"].includes(status))
        fail("image_rights_status", "image_rights_status must be CLEARED, PENDING or NOT_CLEARED");
      const existing = [...media.values()].find(
        (m) => m.productId === productId && m.file === file,
      );
      if (!existing && width && height) {
        const n = (mediaCount.get(productId) ?? 0) + 1;
        mediaCount.set(productId, n);
        const rights: MediaAsset["rights"] = { status: status as MediaAsset["rights"]["status"] };
        const basis = get("image_rights_basis");
        if (basis) rights.basis = basis as NonNullable<MediaAsset["rights"]["basis"]>;
        if (get("image_license_id")) rights.licenseId = get("image_license_id");
        if (get("image_license_url")) rights.licenseUrl = get("image_license_url");
        if (get("image_source_page_url")) rights.sourcePageUrl = get("image_source_page_url");
        if (get("image_creator")) rights.creator = get("image_creator");
        if (get("image_attribution")) rights.attributionText = get("image_attribution");
        if (get("image_rights_evidence")) rights.evidence = get("image_rights_evidence");
        media.set(`${productId}-img-${n}`, {
          id: `${productId}-img-${n}`,
          productId,
          kind: "photo",
          file,
          altVi: get("image_alt_vi"),
          width,
          height,
          rights,
        });
      }
    }
  });

  const sortById = <T extends { id: string }>(m: Map<string, T>) =>
    [...m.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    ok: errors.length === 0,
    errors,
    products: sortById(products),
    variants: sortById(variants),
    offers: sortById(offers),
    media: sortById(media),
  };
}
