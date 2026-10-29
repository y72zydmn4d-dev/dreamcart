# Catalog and Image Provenance Schema

**Status:** Phase 0 specification. Phase 1 turns it into Zod schemas; this document is the source of truth until then.
**Storage:** versioned data files in the repository, validated at build time. Changes arrive by pull request. No database in the MVP, but the shape maps 1:1 to future Postgres tables.

## Entities

```
Source 1──* Offer *──1 Variant *──1 Product
                 Offer 1──1 PriceObservation
Product/Variant 1──* MediaAsset
```

Identity rules (from the Blueprint): **Product** (brand + family + model), **Variant** (a source-backed attribute combination), **Offer** (a seller listing of one variant), and **PriceObservation** are distinct. A variant's attributes are never inferred from another variant.

### Source

| Field | Type | Rule |
|---|---|---|
| `id` | string | stable slug |
| `kind` | `retailer` \| `manufacturer` \| `open_data` \| `owner_curated` | |
| `name`, `domain` | string | domain is lowercase host only |
| `termsReviewedAt` | ISO date \| null | null = not reviewed |
| `persistencePolicy` | `snapshot_allowed` \| `reference_only` \| `unknown` | `unknown` blocks checkout (see Eligibility) |
| `policyEvidence` | URL \| note | clause reference |

### Product

`id` (slug), `brand`, `family`, `model` (may be empty), `category` (`laptop` \| `phone` \| `audio` for now), `titleVi`, `summaryVi`, `verificationStatus` (`verified` \| `needs_review`), `createdAt`. Only `verified` products ship. Ids beginning `fx-` are reserved for test fixtures and rejected in production builds.

### Variant

`id`, `productId`, `attributes` (typed per category), `gtin` (nullable), `variantKey` (unique per product, derived deterministically from attributes). Attribute vocabularies:

- laptop: `screen_in` (number), `chip` (string), `ram_gb` (int), `storage_gb` (int), `color` (optional)
- phone: `storage_gb` (int), `color` (string)
- audio: `type` (earbuds \| over_ear \| on_ear), `color` (string)

A missing attribute stays missing; it is never defaulted.

### Offer

`id`, `variantId`, `sourceId`, `url` (http/https, no credentials, tracking parameters stripped), `merchantName`, `availability` (`in_stock` \| `out_of_stock` \| `unknown`), `price` (PriceObservation). Currency is the original currency of the source. No conversion.

### PriceObservation

| Field | Type | Rule |
|---|---|---|
| `amountMinor` | integer ≥ 0 | VND has exponent 0, so 1,000,000 VND is `1000000`. Per-currency exponent table in code |
| `currency` | ISO 4217 | `VND` for MVP checkout |
| `observedAt` | ISO datetime | when a human saw it |
| `observer` | string | curator handle |
| `provenanceType` | `curator_observed` \| `manufacturer_listed` \| `user_entered` | |
| `evidenceUrl` | URL | the page viewed |
| `evidenceNote` | string | optional (for example "list price, promotion excluded") |

### MediaAsset (image provenance record)

| Field | Type | Rule |
|---|---|---|
| `id` | string | |
| `productId` / `variantId` | string | one required |
| `kind` | `photo` \| `official_render` \| `placeholder` | `placeholder` is generic category art, never product-specific |
| `file` | repo path | self-hosted under `public/`; no hotlinking of third-party hosts |
| `altVi` | string | required |
| `width`, `height` | int | for layout without shift |
| `rights.status` | `CLEARED` \| `PENDING` \| `NOT_CLEARED` | only `CLEARED` renders as a product image |
| `rights.basis` | `open_license` \| `written_permission` \| `published_terms` \| `own_work` | required when CLEARED |
| `rights.licenseId` | string | SPDX or Creative Commons id when applicable |
| `rights.licenseUrl`, `rights.sourcePageUrl` | URL | |
| `rights.creator`, `rights.attributionText` | string | displayed where the license requires |
| `rights.evidence` | URL or repo path to the permission/terms record | required when CLEARED |
| `rights.restrictions` | string[] | for example "no modification" |
| `rights.reviewedBy`, `rights.reviewedAt` | string, ISO date | |
| `rights.expiresAt` | ISO date \| null | |

**Rendering rules.** Not `CLEARED` → show the placeholder with the label "Ảnh minh hoạ chưa có". Placeholders must not imitate a photograph of the product. The project does not generate fictional product photography. Third-party trademark and logo artwork is not used as decoration.

## Derived price states (computed, never stored)

`age = now − observedAt`. Constants live in one config file and are **proposals for owner confirmation**:

| State | Condition | Display | Cart / checkout |
|---|---|---|---|
| `OBSERVED` | provenance is curator/manufacturer and age ≤ 14 days | "Giá tham khảo, ghi nhận ngày …" | allowed |
| `STALE` | age 15–90 days | same plus warning badge "Giá có thể đã thay đổi" | allowed with badge, repeated in checkout |
| `EXPIRED` | age > 90 days | "Giá đã cũ, chưa cập nhật" | viewable; **not addable** |
| `USER_ENTERED` | provenance `user_entered` | "Người dùng nhập, chưa xác minh" | allowed |
| `UNAVAILABLE` | no price | "Chưa có giá" | not addable |

## Eligibility rules (summary)

An offer can enter the cart only if: its price state is `OBSERVED`, `STALE`, or `USER_ENTERED`; its source `persistencePolicy` is `snapshot_allowed` (user-entered offers are local user data and exempt); and its currency is `VND` for MVP checkout. A cart is single-currency. Other currencies stay viewable with original currency and provenance; there is no exchange-rate conversion.

## Validation (build time, Phase 2)

Zod parse; unique ids; every product has ≥ 1 variant; every variant has ≥ 1 offer or an explicit no-offer status; every shipped offer has a source and a price observation; `variantKey` unique per product; `CLEARED` media has basis and evidence; no `fx-` ids; no rights status `PENDING`/`NOT_CLEARED` rendered as a product image. A failing check fails the build.

## Curation input format

Human curators fill one row per variant-offer in `docs/templates/catalog_curation_template.csv`. A script (Phase 2) converts and validates the CSV into the data files. See `docs/CURATION_PROCESS.md`.
