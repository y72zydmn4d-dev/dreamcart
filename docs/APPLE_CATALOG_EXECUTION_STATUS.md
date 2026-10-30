# Apple Store Vietnam catalog program: execution status

The resume point for the Apple catalog program (ADR-015). On resume: fetch `origin`, read this file and `docs/EXECUTION_STATUS.md`, inspect open pull requests, then continue with **Next action**. Do not repeat completed batches.

## Prerequisites (verified 2026-10-30)

| Check | Result |
|---|---|
| F01–F04 remediation | PR #15 merged (`e043de3`); milestone closed in PR #16 (`e42474c`); owner confirmed `e043de3` Ready in Production |
| Open pull requests | none at the start of Batch 0 |
| Production deployment | Vercel project `dreamcart` follows `main` (owner confirmed): every merge to `main` is published. `dreamcart-b963` is untouched |
| Staged catalog in production | impossible by construction: staging is never served when `VERCEL_ENV=production` (ADR-015) |

## Batches

| Batch | Status | Notes |
|---|---|---|
| 0 Source, licensing, inventory foundation | ENGINEERING_COMPLETE (merged `3767b17`, PR #17) | activation gate, staging, manifest, register |
| 1 Mac and displays | **PARTIALLY_COMPLETE: engineering foundations done; verified records 0; `BLOCKED_EXTERNAL_DEPENDENCY` on a permission basis** | terms read; compliant plan in `docs/APPLE_ACQUISITION_PLAN.md`; not complete |
| 2 iPhone | not started (schema exists; no records) | `BLOCKED_EXTERNAL_DEPENDENCY` on B-A1 |
| 3 iPad | schema ready (`tablet`); no records | `BLOCKED_EXTERNAL_DEPENDENCY` on B-A1 |
| 4 Apple Watch | schema ready (`wearable`); no records | `BLOCKED_EXTERNAL_DEPENDENCY` on B-A1 |
| 5 AirPods, Beats, AirTag, Home | schema ready (`audio`, `smart_home`); no records | `BLOCKED_EXTERNAL_DEPENDENCY` on B-A1 |
| 6 Apple accessories | schema ready (`accessory`, `compatibleWith`); no records | `BLOCKED_EXTERNAL_DEPENDENCY` on B-A1 |
| 7 Third-party accessories | schema ready (manufacturer and merchant are separate); no records | `BLOCKED_EXTERNAL_DEPENDENCY` on B-A1 |
| 8 Reconciliation | not started | |
| 9 Storefront integration | not started | |
| 10 Validation and readiness | not started | |

## Batch 0: delivered

- **Activation gate** (`data/catalog/activation.json`, `src/modules/catalog/domain/activation.ts`): `SYNTHETIC_DEMO` (default), `REAL_CATALOG_STAGING`, `VERIFIED_REAL_CATALOG` (needs a recorded owner authorization). Verified records are validated but served only under the verified mode, so merging data does not publish it. Replaces the old rule that a non-empty real catalog won automatically.
- **Staging** (`data/catalog-staging/apple-vn/`): the staged catalog, validated under the real-catalog rules on every build, served only outside production with a visible "Bản xem trước" notice.
- **Inventory manifest and coverage** (`inventory/manifest.json`, `src/modules/catalog/domain/inventory.ts`): per-listing verification, price, image-rights and import statuses; duplicate rejection by normalized URL and by product identity; coverage basis `unknown | partial | complete` (complete needs evidence; no percentage otherwise). `npm run catalog:check` prints the figures.
- **Compliance register** (`inventory/compliance.json`): acquisition methods with status and evidence. Only owner-supplied files are permitted; automated collection and image rehosting or hotlinking are restricted by project rules; manual reading of public pages and a structured feed are unreviewed.
- **ADR-015**, README updates, tests (inventory, activation, compliance, staging, hygiene guard for `VERCEL_ENV`).

## Batch 1: what happened

- **Source access works** (owner enabled `www.apple.com`, `apple.com`, `support.apple.com`; verified 2026-10-30, HTTP 200). The fetch tool still cannot resolve the host; `curl` through the proxy can.
- **Terms read directly.** Apple prohibits automated and "similar manual" acquisition of site content and copying or republishing it (including photographs and the selection and arrangement of product information) without written consent; Apple-owned photographs need written permission. Verbatim clauses and URLs are in `inventory/compliance.json`; summary and conclusions in `docs/APPLE_ACQUISITION_PLAN.md`.
- **Register updated**: automated collection, manual transcription for the catalog, image rehosting and hotlinking are `restricted`; written permission, a licensed dataset, owner-original data and open-licence images are `unreviewed`. No authorized feed or approved image source was found (leads only).
- **Import gate**: `catalog:import` requires `--basis` and refuses a basis the register does not permit; target defaults to staging. All bases are refused today.
- **Reference-price guard**: `price_kind` = `list_price_exact_configuration` is the only price kind imported.
- **Computer and display schemas**: `desktop` and `display` categories with typed attributes (core counts; resolution, glass, stand), exact-variant compatibility, filters, labels, placeholder art; the release gate is unchanged. Tested on fictional "Testmark" data only; rendered locally in a temporary staged catalog (reverted).
- **Staged activation tested**: a staged catalog is served in a Preview and never in production.
- **Not done, not claimed**: no Apple product, price, configuration or image has been recorded. Batch 1 is not complete.

## Independent engineering while rights are pending (owner-authorized)

| Workstream | Delivered | Where |
|---|---|---|
| A Category schemas | `tablet`, `wearable`, `smart_home`, `accessory` with typed attributes and product-level `compatibleWith`; compatibility is a filter and searchable; duplicate products refused; URL-state fix | PR #19 (merged `38d2c12`) |
| B Import infrastructure | Header-driven per-category importer, stable ids, row-level errors, whole-file failure writes nothing, `catalog:preflight` (staging and verified readiness) and `catalog:template`, import guide | PR #20 (see its CI; merge only if green) |
| C Owner-assisted curation | One CSV template per category (`docs/templates/catalog/`), required-field docs, validation commands. Nothing is ever marked authorized by tooling | PR #20 |
| D Source research | Nine candidates evaluated and labeled **Read** or **Lead**; nothing signed up for, accepted, purchased or collected | `docs/APPLE_DATA_SOURCES_RESEARCH.md` |
| E Fictional tests | Tablet configurations, watch case-and-band compatibility, audio variants, accessory compatibility, missing prices, unknown image rights, filters, search accuracy, import failures, legacy Fixturia order compatibility | `tests/discovery/`, `tests/orders/`, `tests/catalog/` |

None of this changes what production serves: `data/catalog/activation.json` is `SYNTHETIC_DEMO` and no record exists to publish.

## Counts (all from the manifest; zero means nothing has been recorded, not that the store is empty)

| Measure | Value |
|---|---|
| Category and subcategory pages inspected / discovered | 0 / 0 |
| Listings discovered / unique products | 0 / 0 |
| Verified products / variants | 0 / 0 |
| Verified price observations | 0 |
| Products with cleared images | 0 |
| Blocked / excluded listings | 0 / 0 |
| Staged / published records | 0 / 0 |
| Coverage basis | unknown |

## Blockers

1. **B-A1 Permission basis (owner action).** No path currently permits importing Apple product data or images. The owner chooses a path from `docs/APPLE_ACQUISITION_PLAN.md` (written permission from Apple, a licensed dataset, owner-original data) and records it in the register. A draft permission request is in the plan. Network access is no longer a blocker.
2. **B-A2 Legal question (owner/counsel).** Whether bare product facts fall outside Apple's protected "Content" is not decided by this repository; until settled, nothing transcribed from `apple.com` is imported.
3. **B-A3 Image rights.** No Apple image has a recorded permission basis; nothing is cleared (ADR-010). Real products show the labeled placeholder.
4. **B-A4 Categories.** Resolved as engineering: all nine categories now have schemas and tests. Records are still zero.

## Next action

Owner: choose and record an acquisition basis (see the plan; A and C can run together). Then Claude imports owner-supplied rows through the gated pipeline into staging, validates, previews, and reports counts for Batch 1. Independent engineering is done as far as it can go without a permission basis (see the table above). The cheapest unblocking steps are the Rights and Permissions request (acquisition plan §4) and owner-original pilot data; the research document lists what else could be examined, and the owner decides which, if any. Nothing from this program is published to production without the owner's explicit authorization.
