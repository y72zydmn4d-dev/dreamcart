# Initial Catalog Curation Process (premium-first, 20–30 products)

**Status:** Phase 0 process definition (revised after self-review). **No catalog data has been created.** Product names, prices, and images are never produced from model memory.

## Who does what

| Step | Owner (human) | Claude |
|---|---|---|
| Choose products | Decides | Supplies coverage plan and selection criteria |
| Look up the source page, record the price | **Does this** (a person viewing a public page; no automated scraping) | Cannot verify live listings; formats and validates rows the owner supplies |
| Image rights and acquisition | Decides, records evidence, contacts rights holders | Checks records for completeness against the schema |
| Write titles and summaries | Writes or approves (own words) | May draft Vietnamese copy from the owner's structured facts, for owner edit |
| Review | Final approval via pull request | Runs validation; flags gaps |

## Coverage plan

Premium-first, 20 minimum, 30 maximum for the MVP. Target 24 (8 per category), then grow incrementally by data availability.

| Category | Target | Variant axes to represent |
|---|---|---|
| Laptops and computers | 8 | screen size, chip, RAM, storage |
| Smartphones | 8 | storage, color |
| Headphones and audio | 8 | type, color |

Selection criteria: premium positioning; currently sold in Vietnam; at least one listing with a visible VND price; variants that differ in ways that exercise exact matching and the dependent configurator (at least 10 products with two or more variants, and at least 4 whose option sets are *not* a full cross product, so dependent options are exercised); a source whose terms the owner has read; and a realistic image path (see below). Prefer manufacturers' own storefront list prices (`manufacturer_listed`) where the terms allow, because they change less often than retailer promotions.

## Procedure per product

1. **Select** the product and the variants to include (only combinations the source shows).
2. **Capture the offer**: URL (strip tracking parameters), merchant, availability, original price and currency exactly as displayed, date and time observed, observer handle, and a note if the price is a list price or includes a promotion.
3. **Record the source policy** (`Source.persistencePolicy`): the clause that permits keeping a price snapshot, or `unknown`. Decision P-3: manually observed prices are acceptable for private development and the pilot once you have read that source's terms (set `snapshot_allowed`); this is not clearance for public deployment (RT-5). `unknown` offers cannot enter the cart.
4. **Evidence stays private.** Keep screenshots or saved pages of the source in a private location outside the repository (they are third-party content). The repository holds only the URL, the observed fact, and the date.
5. **Write the text yourself.** Titles and summaries are in your own words in Vietnamese. Do not copy marketing copy, review text, or spec-sheet prose; record specifications as the structured attributes in the template.
6. **Image path**, first available wins, each recorded as a `MediaAsset.rights` record with evidence:
   1. open license with attribution (check the file's own license page and trademark limits);
   2. written permission or published press terms from the manufacturer (ask early; replies can be slow);
   3. the owner's own photography;
   4. none: `placeholder`, and where an editorial surface needs visual weight, DreamCart `brand_art` (abstract, never presented as a photograph of the product).
   Do not hotlink or copy a retailer's product image. Public availability is not permission.
7. **Fill the CSV** (`docs/templates/catalog_curation_template.csv`). Leave unknown fields empty; never guess.
8. **Second check**: someone other than the curator, or the same person after 24 hours, reopens the source URL and confirms attributes and price; sets `verified_by` and `verified_at`.
9. **Validate and merge** by pull request. The Phase 5 script rejects incomplete rows.

## Definition of "verified entry"

Complete product identity; all required attributes (CATALOG_SCHEMA) present on every variant; at least one offer with URL, merchant, VND price, observation time, observer; source policy recorded; image either `CLEARED` with evidence or an explicit placeholder; curator-written text; second check done.

## Blocker status

**B1:** 0 of 20 minimum entries exist. A person must view live listings; this cannot happen inside this session, and the sandbox blocks external sites. Documented, not worked around.
**B2:** image rights are unresolved for every product, and premium brands are likely to have the most restrictive image terms. Treat image availability as a **selection criterion**, not an afterthought, and start rights outreach in parallel with price capture.

Minimum to start Phase 5 (catalog pipeline): 10 verified entries across all three categories with resolved image status. The Phase 6 storefront needs at least 20 before visual polish.

## Maintenance (accepted limits)

Prices are point-in-time observations, not live data. Past the warn window they show a warning; the build prints an advisory list of offers needing a refresh. Refreshing is a manual re-verification; there is no price tracking or crawling.
