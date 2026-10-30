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
import { deriveProductId } from "../domain/product-id";

/**
 * The only price a catalog offer may carry: the full public retail price shown for exactly this configuration.
 * Monthly installments, trade-in or education prices, promotions, bundles and "from" prices are not reference prices
 * and cannot be assigned to a variant (a "from" price describes the cheapest configuration, never the others).
 */
export const REFERENCE_PRICE_KIND = "list_price_exact_configuration";

/**
 * Curation CSV -> catalog records (docs/CURATION_PROCESS.md, the per-category templates in `docs/templates/catalog/` (`docs/CATALOG_IMPORT_GUIDE.md`)).
 * One row per variant-offer. The converter never guesses: a malformed or missing value is an error with the row
 * and column, nothing is defaulted, and nothing is written unless every row converts. Source terms live in
 * `sources.json` (hand-maintained); each offer row must resolve to a source by its URL host.
 */
/**
 * Columns every import file has, in the order templates write them. Attribute columns (below) are added per
 * category: a file carries only the attributes its category has, so a tablet file has no `glass` column.
 */
export const CORE_COLUMNS = [
  "product_id",
  "brand",
  "family",
  "model",
  "category",
  "variant_key",
  "gtin",
  "compatible_with",
  "offer_merchant",
  "offer_url",
  "offer_currency",
  "price_amount_minor",
  "price_observed_at",
  "price_observer",
  "price_provenance_type",
  "price_kind",
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
  "spec_evidence_url",
  "spec_evidence_note",
  "verified_by",
  "verified_at",
  "notes",
] as const;

/** Every attribute a catalog variant can carry, each its own optional column. */
export const ATTRIBUTE_COLUMNS = [...NUMERIC_ATTRIBUTES, ...SLUG_ATTRIBUTES] as const;

/** All columns an import file may use. */
export const CURATION_COLUMNS = [...CORE_COLUMNS, ...ATTRIBUTE_COLUMNS] as const;

/**
 * The columns of the template for one category: the core columns with the category's own attribute columns
 * (required first, then optional) after `category`. This is the header a curator fills in.
 */
export function columnsFor(category: Category): string[] {
  const attributes = [...REQUIRED_ATTRIBUTES[category], ...OPTIONAL_ATTRIBUTES[category]];
  const at = CORE_COLUMNS.indexOf("category") + 1;
  return [...CORE_COLUMNS.slice(0, at), ...attributes, ...CORE_COLUMNS.slice(at)];
}

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

const IMAGE_BASES: readonly string[] = [
  "open_license",
  "written_permission",
  "published_terms",
  "own_work",
];

const foldIdentity = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * `compatible_with`: host device families separated by `;`, each `brand|family` or `brand|family|product_id`.
 * Returns the entries, or a message describing the first problem.
 */
export function parseCompatibleWith(
  cell: string,
): { brand: string; family: string; productId?: string }[] | string {
  if (!cell) return [];
  const out: { brand: string; family: string; productId?: string }[] = [];
  for (const part of cell
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)) {
    const pieces = part.split("|").map((p) => p.trim());
    if (pieces.length < 2 || pieces.length > 3 || !pieces[0] || !pieces[1])
      return `"${part}" must be brand|family or brand|family|product_id (entries separated by ;)`;
    out.push({
      brand: pieces[0],
      family: pieces[1],
      ...(pieces[2] ? { productId: pieces[2] } : {}),
    });
  }
  return out;
}

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
  // Core columns are always required; attribute columns are required only for the categories that need them,
  // which is checked per row (so a missing one is reported with the row that needs it).
  for (const required of CORE_COLUMNS)
    if (!names.includes(required))
      errors.push({ line: 1, column: required, message: `missing column "${required}"` });
  if (new Set(names).size !== names.length)
    errors.push({ line: 1, message: "duplicate column names" });
  if (errors.length > 0) return empty();
  const at = Object.fromEntries(names.map((n, i) => [n, i])) as Record<string, number>;

  const products = new Map<string, Product>();
  const variants = new Map<string, Variant>();
  const offers = new Map<string, Offer>();
  const media = new Map<string, MediaAsset>();
  const mediaCount = new Map<string, number>();
  const identities = new Map<string, string>();
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
    const get = (c: string) => (at[c] === undefined ? "" : (cells[at[c]] ?? "").trim());

    // Product identity (all rows of a product must agree).
    const category = get("category") as Category;
    if (!(CATEGORIES as readonly string[]).includes(category))
      return fail("category", `category must be one of ${CATEGORIES.join(", ")}`);
    // A stable id: the curator's, or one derived from manufacturer, family and model (never guessed from anything else).
    let productId = get("product_id");
    if (!productId) {
      if (!get("brand") || !get("family") || !get("model"))
        return fail(
          "product_id",
          "product_id is empty, so brand, family and model are needed to derive a stable id from them",
        );
      productId = deriveProductId({
        brand: get("brand"),
        family: get("family"),
        model: get("model"),
      });
    }
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
    const compat = parseCompatibleWith(get("compatible_with"));
    if (typeof compat === "string") fail("compatible_with", compat);
    const evidenceUrl = get("spec_evidence_url");
    const evidenceNote = get("spec_evidence_note");
    if (Boolean(evidenceUrl) !== Boolean(evidenceNote))
      fail(
        "spec_evidence_url",
        "spec_evidence_url and spec_evidence_note must both be filled or both empty",
      );
    if (evidenceUrl && !parseSafeUrl(evidenceUrl).ok)
      fail("spec_evidence_url", "spec_evidence_url is not a safe http(s) URL");
    if (verifiedBy && !evidenceUrl)
      fail(
        "spec_evidence_url",
        "a verified product needs spec evidence: the page the specifications were checked on, and a note",
      );
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
      ...(Array.isArray(compat) && compat.length > 0 ? { compatibleWith: compat } : {}),
      ...(evidenceUrl && evidenceNote
        ? { specEvidence: { url: evidenceUrl, note: evidenceNote } }
        : {}),
    };
    const seen = products.get(productId);
    if (!seen) {
      const identity = [product.brand, product.family, product.model].map(foldIdentity).join("|");
      const twin = identities.get(identity);
      if (twin !== undefined && twin !== productId)
        fail(
          "product_id",
          `"${productId}" has the same manufacturer, family and model as "${twin}"; one product, one id`,
        );
      else identities.set(identity, productId);
      products.set(productId, product);
    } else {
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
      for (const [key, column] of [
        ["compatibleWith", "compatible_with"],
        ["specEvidence", "spec_evidence_url"],
      ] as const) {
        if (JSON.stringify(seen[key] ?? null) !== JSON.stringify(product[key] ?? null))
          fail(column, `product "${productId}" has conflicting ${column} on different rows`);
      }
    }

    // Variant attributes.
    const allowed = new Set<string>([
      ...REQUIRED_ATTRIBUTES[category],
      ...OPTIONAL_ATTRIBUTES[category],
    ]);
    const attributes: Record<string, string | number> = {};
    for (const key of [...NUMERIC_ATTRIBUTES, ...SLUG_ATTRIBUTES]) {
      const raw = get(key);
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
    for (const key of REQUIRED_ATTRIBUTES[category]) {
      if (attributes[key] !== undefined) continue;
      if (at[key] === undefined)
        fail(
          key,
          `the "${key}" column is required for ${category}: add it (the ${category} template has it)`,
        );
      else if (!get(key)) fail(key, `"${key}" is required for ${category}`);
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
          const kind = get("price_kind");
          if (kind !== REFERENCE_PRICE_KIND)
            fail(
              "price_kind",
              `price_kind must be ${REFERENCE_PRICE_KIND}: only the full public price of exactly this configuration is imported (not monthly, trade-in, education, promotional, bundle or "from" prices); leave the price empty if only another kind is known`,
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
      const dimension = (c: string) =>
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
      const basis = get("image_rights_basis");
      if (basis && !IMAGE_BASES.includes(basis))
        fail("image_rights_basis", `image_rights_basis must be one of ${IMAGE_BASES.join(", ")}`);
      if (status === "CLEARED") {
        if (!basis) fail("image_rights_basis", "a CLEARED image needs its permission basis");
        if (!get("image_rights_evidence"))
          fail(
            "image_rights_evidence",
            "a CLEARED image needs evidence of the permission (a reference, not a claim)",
          );
      }
      const existing = [...media.values()].find(
        (m) => m.productId === productId && m.file === file,
      );
      if (!existing && width && height) {
        const n = (mediaCount.get(productId) ?? 0) + 1;
        mediaCount.set(productId, n);
        const rights: MediaAsset["rights"] = { status: status as MediaAsset["rights"]["status"] };
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
