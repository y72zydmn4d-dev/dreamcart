# Catalog readiness and curation-input checklist

**Status (Phase 5): the catalog engine is complete; the real catalog is `BLOCKED_EXTERNAL_DEPENDENCY`.** `data/catalog/` holds 0 of the 20 minimum verified products. Nothing was invented to fill it, and the sandbox cannot view live listings (blocker B1) or establish image rights (B2). Everything downstream is built and tested on the labeled synthetic fixtures in `data/synthetic/`.

Check it any time with `npm run catalog:check` (also the first step of `npm run build`).

## What exists

- **Validation pipeline** (`src/modules/catalog`): `validateCatalog` rejects, with the path and a fix, every class of invalid record: schema violations, duplicate ids and variant keys, unknown references, unverified products, `fx-` ids in the real catalog (and non-`fx-` ids in the synthetic one), variants without required attributes or with attributes their category does not have, mismatched variant keys, unsafe or tracking-laden offer links, links off the source's domain, future observations, prices without observer and evidence, user-entered prices, snapshot sources whose terms were never reviewed, images beyond budget, missing Vietnamese labels, ambiguous search aliases, bad featured lists. Stale prices, sources that block the cart, unpriced products and image-less products are advisories, never failures.
- **Ingestion**: `npm run catalog:import -- file.csv` converts the curation template (`docs/templates/catalog_curation_template.csv`) into JSON; any bad row aborts with line, column and fix, and nothing is written.
- **Content version**: every validated catalog carries a SHA-256-based `catalogVersion` stored on orders.
- **Discovery engine** (`src/modules/discovery`): search with the Phase 3 exact-variant rules over catalog-derived vocabulary, category-specific facets with counts, price ranges, sorting, suggestions and URL state, all from data that exists. Starting prices come only from verified VND offers; unpriced configurations stay unpriced.
- **Images**: only `CLEARED` records ever render; size and file-existence budgets are checked; attribution for the Credits page is extracted from rights records.

## What the owner must supply (to clear the blocker)

For each of at least 20 products (about 8 laptops, 8 phones, 8 audio), premium and sold in Vietnam:

1. **Identity**: brand, family, model, category; a title and summary in your own words (not copied marketing text).
2. **Variants**: only the combinations the source actually shows. Laptop: screen size, chip, RAM, storage (color optional). Phone: storage, color (chip optional). Audio: type (`earbuds`, `over_ear`, `on_ear`), color. Values as lowercase slugs (`natural_titanium`).
3. **At least one offer per priced variant**: the product page URL (tracking stripped), merchant, the price exactly as shown in whole VND, the date observed, your handle, and a note ("list price, promotion excluded"). The source must be listed in `sources.json` with the date you read its terms and its persistence policy (`snapshot_allowed` only for sources whose terms you read).
4. **Image rights per image** (or none: a designed placeholder is used): file, alt text, dimensions, rights status and basis, and the evidence (license URL or permission record). Public availability is not permission. Keep third-party screenshots private, outside the repository.
5. **Second check** by someone else (or yourself after 24 hours): `verified_by` and `verified_at`.
6. **Vocabulary**: a Vietnamese label for every chip, color and type value, and optional single-word search aliases.
7. **Featured**: up to 12 product ids for the homepage.

Then run `npm run catalog:import -- yourfile.csv`, review the diff, and open a pull request. The first 10 verified entries start the real-catalog search fixtures (owner-approved expectations in `fixtures/`).

## Gates this blocks

| Gate | Status |
|---|---|
| Phase 5 real-data acceptance (20+ verified products, image rights evidenced) | `BLOCKED_EXTERNAL_DEPENDENCY` |
| Phase 12 real-product release | blocked until the above; a private candidate on synthetic data can still be demonstrated |
| Authorized provider integrations (Shopify, eBay, Amazon, Lazada…) | not started: provider terms are unverified (`docs/PRODUCT_SOURCE_MATRIX.md`); no scraping, no paid APIs |
