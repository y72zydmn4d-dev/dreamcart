# Initial Catalog Curation Process (about 20 products)

**Status:** Phase 0 process definition. **No catalog data has been created.** Product names, prices, and images are never produced from model memory.

## Who does what

| Step | Owner (human) | Claude |
|---|---|---|
| Choose products | Decides | Supplies the coverage plan and selection criteria |
| Look up the source page and record the price | **Does this** (a person viewing a public page; no automated scraping) | Cannot verify live listings; may format and validate rows the owner supplies |
| Determine image rights | Decides and records evidence | Checks records for completeness against the schema |
| Review | Final approval via pull request | Runs validation; flags gaps |

## Coverage plan (start with about 20)

| Category | Target | Variant axes to represent |
|---|---|---|
| Laptops and computers | 7 | screen size, chip, RAM, storage |
| Smartphones | 7 | storage, color |
| Headphones and audio | 6 | type, color |

Selection criteria: product is currently sold in Vietnam; at least one retailer listing with a visible VND price; variants differ in ways that exercise exact matching (at least 8 of the 20 products should have two or more variants); mix of price tiers; a source whose terms the owner has read. Expansion is incremental, driven by data availability and UX needs.

## Procedure per product

1. **Select** the product and the variants to include (only variants for which a source shows the exact attribute combination).
2. **Capture the offer** from a retailer or manufacturer page: URL (strip tracking parameters), merchant name, availability, original price and currency exactly as displayed, date and time observed, observer handle, and a note if the price includes a promotion or only a list price.
3. **Rights for the source** (`Source.persistencePolicy`): record the clause that permits keeping a price snapshot, or mark `unknown`. Entries with `unknown` can be browsed but are not checkout-eligible. The owner's own manual recording of a price they saw is the default basis; the owner confirms this default in ADR-002.
4. **Image path**, first available wins:
   1. open license with attribution (for example a Commons file; check the file's own license page and trademark limits);
   2. written permission or published press terms from the manufacturer;
   3. the owner's own photography;
   4. none → `placeholder`.
   Record `MediaAsset.rights` with evidence. Do not hotlink or copy a retailer's product image. Do not use an image because it is publicly accessible.
5. **Fill the CSV** row(s) using `docs/templates/catalog_curation_template.csv`. Unknown fields stay empty; never guess.
6. **Second check**: someone other than the curator, or the same person after 24 hours, re-opens the source URL and confirms the variant attributes and price. Sets `verified_by` and `verified_at`.
7. **Validate and merge** by pull request. The Phase 2 script rejects incomplete rows.

## Definition of "verified entry"

Complete product identity; at least one variant whose attributes are all source-backed; at least one offer with URL, merchant, VND price, observation time, and observer; source policy recorded; image either `CLEARED` with evidence or an explicit placeholder; second check done.

## Blocker status (Phase 0)

**Blocker B1: 0 of 20 entries exist.** Lawful creation requires a person viewing live listings and recording what they see, which cannot happen inside this session (no live verification path, and the network allowlist blocks external sites). This is documented, not worked around. Phase 1 proceeds with synthetic fixtures (`fixtures/`), which are test-only and never shipped.

**Minimum to unblock Phase 2:** at least 10 verified entries covering all three categories, each with a resolved image status (`CLEARED` or placeholder). Up to 20 are targeted before beta.

## Maintenance (accepted limits)

Prices are point-in-time observations, not live data. After 14 days they show a warning, after 90 days they stop being addable. Refreshing is a manual re-verification pass; there is no price tracking or crawling.
