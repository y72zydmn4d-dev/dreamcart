# Catalog, Pricing, Snapshot, and Configurator Schema

**Status:** Phase 0 specification (revised after self-review). Phase 3 turned it into Zod schemas and domain code (`src/modules/*/domain`); this document stays the source of truth for the rules. Conformance fixtures: `fixtures/pricing/`, `fixtures/configurator/`, `fixtures/search/`, run by `npm test`.
**Storage:** versioned data files in the repository, validated at build time; changes arrive by pull request. No database in the MVP; the shape maps 1:1 to future Postgres tables.

Owner decisions P-1 (freshness), P-3 (manual observations), and P-5 (configurator) are recorded in `docs/DECISIONS.md` and applied below.

## Entities

```
Source 1──* Offer *──1 Variant *──1 Product
                 Offer 0..1──1 PriceObservation
Product/Variant 1──* MediaAsset
```

Product (brand + family + model), Variant (a source-backed attribute combination), Offer (a seller listing of one variant), and PriceObservation are distinct. Attributes are never inferred from another variant.

### Source

| Field | Rule |
|---|---|
| `id`, `name`, `domain` | slug; lowercase host only |
| `kind` | `retailer` \| `manufacturer` \| `open_data` \| `owner_curated` |
| `termsReviewedAt` | ISO date or null (null = not reviewed) |
| `persistencePolicy` | `snapshot_allowed` \| `reference_only` \| `unknown`. **Decision P-3:** manually observed prices are acceptable for private development and pilot testing, so a curator may set `snapshot_allowed` for a source whose terms they have read. This is not legal clearance for unrestricted redistribution or public deployment (RT-5). Each observation carries provenance and a timestamp. `unknown` blocks the cart (fixture O13) |
| `policyEvidence` | URL or note naming the clause |

### Product

`id` (slug), `brand`, `family`, `model` (may be empty), `category` (`laptop` \| `phone` \| `audio` initially; not a permanent restriction), `titleVi`, `summaryVi`, `verificationStatus` (`verified` \| `needs_review`), `createdAt`. Only `verified` products ship. Ids beginning `fx-` are reserved for fixtures and rejected in production builds.

**Authoring rule.** `titleVi`, `summaryVi`, and any descriptive text are written by the curator in their own words. Merchant or manufacturer marketing copy, review text, and spec-sheet prose are not copied. Specifications are recorded as structured facts (attribute values), not pasted text.

### Variant

`id`, `productId`, `attributes`, `gtin` (nullable), `variantKey` (deterministic, unique per product).

| Category | Required attributes (production) | Optional |
|---|---|---|
| laptop | `screen_in`, `chip`, `ram_gb`, `storage_gb` | `color` |
| phone | `storage_gb`, `color` | `chip` |
| audio | `type` (earbuds \| over_ear \| on_ear), `color` | |

A shipped variant must carry every required attribute, because an unconfigurable variant can never be selected or matched. Optional attributes may be absent and are then *unknown*, never defaulted. (The fixture catalog intentionally violates this to test unknown handling.)

### Offer

`id`, `variantId`, `sourceId`, `url` (http/https, no credentials, tracking parameters stripped), `merchantName`, `availability` (`in_stock` \| `out_of_stock` \| `unknown`), `price` (PriceObservation **or null**). A variant with no offers, or only offers with `price: null`, is `UNAVAILABLE`.

### PriceObservation

| Field | Rule |
|---|---|
| `amountMinor` | safe integer ≥ 1. VND has exponent 0 (1,000,000 VND is `1000000`). Unknown price is `null`, never `0` |
| `currency` | ISO 4217, uppercase three letters. `VND` for MVP checkout |
| `observedAt` | ISO datetime when a human saw it. Build validation rejects future values; at runtime a future value is treated as age 0 |
| `observer` | curator handle |
| `provenanceType` | `curator_observed` \| `manufacturer_listed` \| `user_entered` |
| `evidenceUrl`, `evidenceNote` | the page viewed; for example "list price, promotion excluded" |

### MediaAsset (image provenance record)

| Field | Rule |
|---|---|
| `id`, `productId` / `variantId` | one target required |
| `kind` | `photo` \| `official_render` \| `brand_art` \| `placeholder`. `brand_art` is abstract DreamCart-authored artwork (never presented as a photograph of the product); `placeholder` is generic category art |
| `file` | self-hosted repo path; no hotlinking. Pre-generated responsive sizes (see ARCHITECTURE §8) |
| `altVi`, `width`, `height` | required |
| `rights.status` | `CLEARED` \| `PENDING` \| `NOT_CLEARED`. Only `CLEARED` renders as a product image |
| `rights.basis` | `open_license` \| `written_permission` \| `published_terms` \| `own_work` (required when CLEARED; `brand_art` is `own_work`) |
| `rights.licenseId`, `licenseUrl`, `sourcePageUrl`, `creator`, `attributionText` | as the license requires |
| `rights.evidence` | URL or path to the permission or terms record (required when CLEARED) |
| `rights.restrictions`, `reviewedBy`, `reviewedAt`, `expiresAt` | |

**Rendering rules.** Not `CLEARED` → the placeholder with the label "Ảnh minh hoạ chưa có". The project does not generate fictional product photography. Third-party trademarks and logo artwork are not used as decoration. Required attributions appear on the product page and on a Credits page.

## Derived price state (computed, never stored)

Configuration (a single file; values decided in P-1, other values stay possible because they are configuration):

```
warnAfterDays: { curator_observed: 14, manufacturer_listed: 45 }
blockAfterDays: null          // a number would make older prices EXPIRED (not addable)
```

`age = max(0, now − observedAt)`.

| State | Condition | Display | Cart |
|---|---|---|---|
| `OBSERVED` | `age ≤ warnAfterDays[provenance]` | "Giá tham khảo, ghi nhận ngày …" | allowed |
| `STALE` | older than the warn window (and not expired) | same + "Giá có thể đã thay đổi" | allowed with badge, repeated at checkout |
| `EXPIRED` | only if `blockAfterDays` is set and `age > blockAfterDays` | "Giá đã cũ, chưa cập nhật" | viewable, **not addable** |
| `USER_ENTERED` | provenance `user_entered`; no staleness | "Người dùng nhập, chưa xác minh" | allowed |
| `UNAVAILABLE` | no offer or `price: null` | "Chưa có giá" | not addable |

Boundaries are inclusive (exactly the window is still the earlier state); see offers O02, O03, O06, O07.

## Cart eligibility (ordered checks; first failure wins)

1. `UNAVAILABLE` → `no_price`; `EXPIRED` → `expired`.
2. Currency not `VND` → `currency_not_supported` (still viewable with original currency; no conversion).
3. Not `USER_ENTERED` and source policy not `snapshot_allowed` → `source_reference_only` or `source_policy_unknown`.

Cart lines are keyed by `variantId + offerId`; the same key merges quantities, a different offer for the same variant is a separate line. Quantity is an integer 1–99; adding past 99 is rejected visibly and leaves the line unchanged (no silent clamp). Subtotals are integers per currency. Checkout requires a non-empty single-currency VND cart. See cart cases C01–C12.

## Order snapshot (immutable; a virtual order stores everything it needs to render forever)

Per item: `productId`, `variantId`, `offerId`, `brand`, `titleVi`, `attributes`, `quantity`, merchant name and source URL, price (`amountMinor`, `currency`, `observedAt`, `provenanceType`, `evidenceUrl`), `priceStateAtPlacement` and the warning shown, source `persistencePolicy`, and an `imageRef` (`mediaId`, `file`, `rightsStatus`, `attributionText`). Per order: `catalogVersion` (content hash of the catalog at placement), scenario snapshot, destination preset, payment label, `idempotencyKey`, `code`, timestamps.

Rendering a snapshot's image re-checks the **current** media registry: if the asset is gone or no longer `CLEARED`, the placeholder is shown. A product that left the catalog still renders from its snapshot (without a live link to the product page).

## Configurator derivation (hybrid configurator with dependent options)

Option groups per category, in order: laptop `screen_in, chip, ram_gb, storage_gb`; phone `storage_gb, color`; audio `type, color`. All options come from real variants; nothing is invented.

- A value is **available** if at least one variant has that value and matches every *other* currently selected group; **selected** if chosen; otherwise **unavailable** (shown disabled with a reason, never hidden).
- Selecting an unavailable value changes nothing: the result is `needs_reset` naming the conflicting groups, and the UI offers an explicit reset of those groups. Nothing is changed silently.
- A variant resolves only when every group is selected and exactly one variant matches. Add-to-cart is disabled until then. Image, specs, and price change only when backed by the resolved variant's data.

Cases K01–K12 define the behavior. The presentation is the owner-approved **Hybrid Continuous Configurator** (decision P-5): every group on one page, collapsible sections, revisitable selections, quick navigation between groups, and a sticky summary; never a mandatory wizard. Visual and interaction design is the Phase 2 specification.

## Validation (build time; implemented in Phase 5)

Zod parse; unique ids; `variantKey` unique per product; required attributes present; every shipped offer has a source and either a valid price observation or `null`; `observedAt` not in the future; `CLEARED` media has basis and evidence; no `fx-` ids; no `PENDING`/`NOT_CLEARED` image rendered as a product image; each product has a `verified` status. A failing check fails the build. An advisory (non-failing) report lists offers past their warn window so curators can refresh them.

## Curation input

Human curators fill one row per variant-offer in `docs/templates/catalog_curation_template.csv`; a Phase 5 script converts and validates it into the data files. See `docs/CURATION_PROCESS.md`.

## Phase 5 implementation notes

- Data lives in `data/catalog/` (real) and `data/synthetic/` (fixtures): `sources`, `products`, `variants`, `offers`, `media`, `vocabulary`, `featured`. `validateCatalog` is the only gate; the build runs it (`npm run catalog:check`).
- Ids: variant `"<productId>:<attribute values in group order>"`, offer `"<variantId>@<sourceId>"`. `variantKey` must equal the key derived from the attributes. Coded values (`chip`, `color`, `type`) are lowercase slugs with a Vietnamese label in `vocabulary.json`.
- Products may carry curated `facts` (structured, curator-written). `featured` is an editorial list of product ids.
- Real mode rejects `fx-` ids, unverified products and prices without observer plus evidence; synthetic mode accepts only `fx-` ids. A real catalog with at least one verified product is used automatically; otherwise non-release builds fall back to the labeled synthetic catalog, and a release build (`NEXT_PUBLIC_DREAMCART_RELEASE=1`) refuses to start.
- Image files: at most 6 per product, source files at most 1.5 MB, must exist when `CLEARED`. Responsive pre-generated sizes arrive with the first real images.
- Curation CSV: the template gained `image_alt_vi`, `image_width`, `image_height`. One row per variant-offer; sources are resolved from the offer URL's host against `sources.json`.
