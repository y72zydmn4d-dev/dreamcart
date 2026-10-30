# Catalog import guide (owner-assisted curation)

How real product data gets into DreamCart without code changes. It applies to any source and any manufacturer; nothing here is Apple-specific. **Importing needs a permitted acquisition basis recorded in the compliance register** (`data/catalog-staging/apple-vn/inventory/compliance.json`, ADR-015); the tool refuses otherwise and never marks content as authorized by itself.

## The flow

1. **Record the basis.** In the register, a `written_permission`, `licensed_dataset` or `owner_original_data` entry with status `permitted`, its evidence and date. Until then every import is refused.
2. **Pick the template.** `npm run catalog:template` writes one header-only CSV per category into `docs/templates/catalog/` (`laptop`, `desktop`, `display`, `tablet`, `phone`, `wearable`, `audio`, `smart_home`, `accessory`). A template has the core columns plus that category's attribute columns; leave unknown cells empty, never guess.
3. **Fill one row per variant-offer.** Rows of one product repeat its product fields and must agree.
4. **Add the source** to `sources.json` of the target (its domain, kind, terms review date, persistence policy) before rows that link to it.
5. **Import into staging.** `npm run catalog:import -- file.csv --basis <basis>` (target `staging` by default; `--target verified` writes `data/catalog/`, which still publishes nothing until activation). A bad row aborts the whole file with its line, column and a fix; nothing is written.
6. **Check and preview.** `npm run catalog:check` (validation and coverage), `npm run catalog:preflight` (the activation checklist: records, reconciliation with the inventory manifest, register, rights, release gate, owner authorization). A Preview deployment shows staged data only when `activation.json` is `REAL_CATALOG_STAGING`; production never does.

## Columns

**Product identity** (every row)

| Column | Required | Format and notes |
|---|---|---|
| `product_id` | no | Lowercase letters, digits and hyphens, at most 64. **Leave empty to derive a stable id** from brand, family and model (case, accents and punctuation do not change it). Never `fx-`. |
| `brand` | yes | The **manufacturer** as the source names it. The merchant is separate (`offer_merchant`). |
| `family`, `model` | yes | Product family and model; with `brand` they identify the product: a second id for the same triple is refused. |
| `category` | yes | One of the nine categories above. |
| `title_vi`, `summary_vi` | yes | Vietnamese, **your own words**; do not paste marketing text. |
| `compatible_with` | no | Host device families the product works with: `brand\|family` or `brand\|family\|product_id`, separated by `;`. Empty means "not stated" (unknown), not "universal". |

**Attribute columns** (per category, values from the source only): `screen_in`, `chip`, `ram_gb`, `storage_gb`, `cpu_cores`, `gpu_cores`, `type`, `color`, `resolution`, `glass`, `stand`, `connectivity`, `case_mm`, `case_material`, `band_type`, `band_size`, `band_color`, `noise_control`, `connector`, `device_type`, `accessory_type`, `size`, `material`, `length_cm`, `power_w`, `package_qty`, `fits_case_mm`. Numbers are plain numbers without units (`storage_gb` 1024, not "1 TB"); coded values are lowercase slugs (`natural_titanium`), each needing a Vietnamese label in the vocabulary file. A category's required attributes are enforced per row (for example a tablet needs `screen_in` and `storage_gb`). A variant exists only if the source offers that exact combination: list every orderable combination, and only those.

| Other variant columns | Required | Notes |
|---|---|---|
| `variant_key` | no | Derived from the attributes; if filled it must match. |
| `gtin` | no | 8 to 14 digits, only if the source shows it. |

**Offer and price** (a row may describe only a variant; a price needs its offer link)

| Column | Required with a price | Format and notes |
|---|---|---|
| `offer_url` | yes | The page the price was seen on (https); its host must have a source record. |
| `offer_merchant` | yes | The seller, for example the store's name. |
| `offer_currency`, `price_amount_minor` | yes | ISO code and a whole amount (VND without separators: `29990000`). |
| `price_observed_at` | yes | ISO date or date-time of the observation. |
| `price_observer`, `price_evidence_note` | recommended | Who saw it and what the page showed; the catalog refuses a price without an observer and evidence. |
| `price_provenance_type` | yes | `curator_observed` or `manufacturer_listed`. |
| `price_kind` | yes | **Only `list_price_exact_configuration`**: the full public price of exactly this configuration. Monthly, trade-in, education, promotional, bundle and "from" prices are refused; leave the price empty if only another kind is known (it stays unknown, never zero). |
| `availability` | no | `in_stock`, `out_of_stock` or `unknown` (default). |

**Spec evidence and verification** (a verified product must show where it was checked)

| Column | Required | Notes |
|---|---|---|
| `spec_evidence_url`, `spec_evidence_note` | with `verified_by` | The page the identity and specifications were checked on and a short note; both or neither. |
| `verified_by`, `verified_at` | both or neither | A second person's check and its ISO date; without them the product stays `needs_review` and cannot ship. |
| `notes` | no | Free text for the curator; not published. |

**Image and its permission** (an image is shown only when its rights are CLEARED; anything else shows the placeholder)

| Column | Required with an image | Notes |
|---|---|---|
| `image_file` | yes | A path under `public/` you added; never a remote URL. |
| `image_alt_vi`, `image_width`, `image_height` | yes | Vietnamese alt text and pixel size. |
| `image_rights_status` | yes | `CLEARED`, `PENDING` or `NOT_CLEARED`. Unknown rights are `PENDING`. |
| `image_rights_basis` | for CLEARED | `open_license`, `written_permission`, `published_terms` or `own_work`. The register must permit that basis (`catalog:preflight` checks). |
| `image_rights_evidence` | for CLEARED | A reference to the grant or licence (not a claim); the catalog refuses CLEARED without it. |
| `image_license_id`, `image_license_url`, `image_source_page_url`, `image_creator`, `image_attribution` | as required | Licence details and the attribution text shown on the Credits page. |

## Reading an error

```
ERROR line 4 column price_kind: price_kind must be list_price_exact_configuration: only the full public price of exactly this configuration is imported (not monthly, trade-in, education, promotional, bundle or "from" prices); leave the price empty if only another kind is known
ERROR line 7 column chip: the "chip" column is required for laptop: add it (the laptop template has it)
REFUSED: "written_permission" has not been reviewed for apple-store-vn; the owner records a decision in the register first
```

Line numbers count the header as line 1. Fix every listed row and run the command again; a file is imported whole or not at all.

## What the tools never do

They do not decide that content is authorized, fetch pages, copy images, or publish anything. Activation is a separate, reviewed change to `data/catalog/activation.json` that needs the owner's recorded authorization.
