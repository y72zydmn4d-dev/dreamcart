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
| 0 Source, licensing, inventory foundation | **Foundation ENGINEERING_COMPLETE; source verification BLOCKED_EXTERNAL_DEPENDENCY** | this PR |
| 1 Mac and displays | not started | needs source access (below) |
| 2 iPhone | not started | |
| 3 iPad | not started | |
| 4 Apple Watch | not started | |
| 5 AirPods, Beats, AirTag, Home | not started | |
| 6 Apple accessories | not started | |
| 7 Third-party accessories | not started | |
| 8 Reconciliation | not started | |
| 9 Storefront integration | not started | |
| 10 Validation and readiness | not started | |

## Batch 0: delivered

- **Activation gate** (`data/catalog/activation.json`, `src/modules/catalog/domain/activation.ts`): `SYNTHETIC_DEMO` (default), `REAL_CATALOG_STAGING`, `VERIFIED_REAL_CATALOG` (needs a recorded owner authorization). Verified records are validated but served only under the verified mode, so merging data does not publish it. Replaces the old rule that a non-empty real catalog won automatically.
- **Staging** (`data/catalog-staging/apple-vn/`): the staged catalog, validated under the real-catalog rules on every build, served only outside production with a visible "Bản xem trước" notice.
- **Inventory manifest and coverage** (`inventory/manifest.json`, `src/modules/catalog/domain/inventory.ts`): per-listing verification, price, image-rights and import statuses; duplicate rejection by normalized URL and by product identity; coverage basis `unknown | partial | complete` (complete needs evidence; no percentage otherwise). `npm run catalog:check` prints the figures.
- **Compliance register** (`inventory/compliance.json`): acquisition methods with status and evidence. Only owner-supplied files are permitted; automated collection and image rehosting or hotlinking are restricted by project rules; manual reading of public pages and a structured feed are unreviewed.
- **ADR-015**, README updates, tests (inventory, activation, compliance, staging, hygiene guard for `VERCEL_ENV`).

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

1. **B-A1 Source access (owner action).** The authoring environment's network policy does not allow `www.apple.com` (DNS does not resolve), so no Apple page, `robots.txt` or terms page could be read, and no listing, configuration or price could be verified. Remedy: allow `www.apple.com` (and any host the owner wants read) under Network access in the environment settings; or supply the facts as owner-curated files (`docs/CURATION_PROCESS.md`). Reading pages is not the same as permission to collect them automatically.
2. **B-A2 Terms not recorded.** Nobody has read and recorded Apple's terms for page reading, structured data or image reuse. The register keeps these `unreviewed`/`restricted`. This is the owner's call (ADR-003: automated extraction needs its own ADR and approved hosts).
3. **B-A3 Image rights.** No Apple image has a recorded permission basis; nothing is cleared (ADR-010, B2). Real products will show the labeled placeholder until rights are resolved.
4. **B-A4 Categories.** Storefront categories are `laptop`, `phone`, `audio` only; each batch extends them with typed attributes when its first verified records exist (ADR-015 item 7).

## Next action

Resolve B-A1 (allow `www.apple.com`, or supply owner-curated rows). Then start Batch 1: record the discovery pages walked and the listings found in `inventory/manifest.json`, verify configurations and prices per listing from the source, stage them in `data/catalog-staging/apple-vn/`, and open a pull request. Nothing from this program is published to production without the owner's explicit authorization.
