# ADR-015: Apple Store Vietnam catalog program: staged ingestion behind an explicit activation gate

**Status:** Accepted (owner program authorization, 2026-10-30)
**Date:** 2026-10-30

## Context
The owner chose Apple Store Vietnam as DreamCart's first large real-product source, replacing the fictional Fixturia catalog as the normal user-facing data. Two facts shape the design. First, the production deployment follows `main`, so anything merged is published; the previous rule "a real catalog with at least one product wins" would have published verified records the moment their pull request merged. Second, the authoring environment cannot reach `www.apple.com`, and the project's own rules (ADR-003, ADR-010) forbid automated extraction without a reviewed permission basis and forbid copying images without recorded rights.

## Decision
1. **Activation is an explicit setting, not a side effect of data.** `data/catalog/activation.json` selects `SYNTHETIC_DEMO` (default), `REAL_CATALOG_STAGING` or `VERIFIED_REAL_CATALOG`. The verified mode needs a recorded owner authorization (the schema refuses it otherwise). Verified records in `data/catalog/` are always validated, but served only under the verified mode.
2. **Staging.** Batches land in `data/catalog-staging/apple-vn/` in the existing catalog file format, validated under the real-catalog rules on every build. Staging is served only outside production (`VERCEL_ENV`, a Vercel system variable: no secret, no owner setup) and carries a visible "Bản xem trước" notice, so Preview deployments can show staged data while the public site cannot, even if the setting reaches `main`. A staging setting with no staged products falls back to the fixtures, with a recorded note.
3. **Acquisition.** No automated page collection (ADR-003 stands). Facts reach the catalog by owner-supplied or assisted curation with per-field provenance (the existing curation CSV path, `docs/CURATION_PROCESS.md`), or by a documented structured feed if one is ever identified and recorded in the compliance register. The register (`inventory/compliance.json`) lists each acquisition method as permitted, restricted or unreviewed with evidence; unreviewed blocks use. This repository does not paraphrase a site's terms from memory.
4. **Inventory manifest** (`inventory/manifest.json`): one record per discovered listing with four independent statuses (verification, price, image rights, import). Coverage is `unknown`, `partial` or `complete`; `complete` needs evidence, and no completion percentage is reported otherwise. Duplicates are rejected by normalized listing URL and by product identity (manufacturer, family, model, package quantity), so one product listed under several categories is one record with secondary categories.
5. **Images.** Asset-level rights stay on `MediaAsset.rights` (CLEARED, PENDING, NOT_CLEARED); inventory-level image coverage uses CLEARED, PENDING_REVIEW, RESTRICTED, UNAVAILABLE. A record may be published only with a cleared image or none (a placeholder).
6. **Identity.** Manufacturer and merchant stay separate fields; real products never use `fx-` ids; internal ids are distinct from manufacturer part numbers, which are recorded only when a source shows them.
7. **Categories.** The storefront's product categories (`laptop`, `phone`, `audio`) are extended per batch, when the first verified records of a new category exist, with typed per-category attributes. They are not extended speculatively.

## Alternatives
- Merge verified data into `data/catalog/` and rely on review: rejected, it publishes on merge.
- A Vercel environment variable as the switch: rejected for now, it needs owner action and is invisible in review; the committed setting is reviewed and the `VERCEL_ENV` guard still protects production.
- Scraping Apple's pages: rejected (ADR-003, access and terms unreviewed, and unreachable from the authoring environment).

## Consequences
(+) Merging staging work is safe; previews can show staged data; every claim about coverage is auditable. (−) Real data needs a person or an authorized feed; discovery cannot be completed from the authoring environment alone. Image rights remain the largest blocker (ADR-010, B2).
