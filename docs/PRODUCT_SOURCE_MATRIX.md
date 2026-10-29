# Product Source Feasibility Matrix

**Status:** Phase 0, evidence incomplete (see "Evidence limits"). **Date:** 2026-10-29.
**Rule:** nothing here is "permitted" unless the evidence says so. `UNKNOWN` means not demonstrated, not "no". No provider is integrated, no account was created, no credential was used, and no API was called.

## Evidence limits (read first)

The sandbox's network allowlist blocked direct reads of `shopify.dev`, `developer.ebay.com`, `affiliate-program.amazon.com`, and `nextjs.org`. Findings below come from web-search summaries of those official pages and from secondary sources. Every claim carries a grade:

- **[S]** summary of an official page, via search; **not read directly**
- **[C]** community, vendor, or third-party statement; weakest
- **[B]** stated in the Blueprint v1.0 citations; **not independently verified**
- **[—]** nothing found

Before any provider moves past "research candidate", the owner (or a session with the hosts allowed) must read the primary terms and record the clause, date, and URL. Quoted text in this file is quoted from search summaries and may not be verbatim.

## Dimensions

T = technical capability. A = access and authentication. L = data licensing and usage. F = fit with a non-purchasing virtual-shopping model. C = caching, snapshots, image reuse. P = phase suitability.

| Source | T | A | L | F | C | P |
|---|---|---|---|---|---|---|
| **Curated repo catalog** (owner-verified) | Yes | None | Owner-controlled; per-record evidence | Full | Snapshots allowed for entries whose own record permits | **MVP** |
| **Manual / user-entered** | Yes | None | User data, labeled unverified | Full | Local only | **MVP** |
| **Shopify Global Catalog** | Likely (MCP tools; REST API reported deprecated [S]) | Unknown (credentials; Blueprint cites an auth tutorial [B]) | Search-result caching **not allowed** [S] | Unknown (non-purchase use not confirmed [B]) | Results: no. Images: unknown [B says no reuse outside listing] | Research; not MVP |
| **eBay Browse API** | Yes | Production = eBay partner approval via partner program; growth check; approval not guaranteed [S] | Unknown | Unknown | Unknown | Future candidate |
| **Amazon Creators API** | Yes | Associates account + at least 10 qualifying sales in 30 days; access lapses without sales [S] | Terms forbid caching customer information; field caching otherwise allowed [S]; 24h limit is an unverified third-party claim [C] | Poor: program purpose is directing sales to Amazon [C] | Unknown | Not viable now |
| **Lazada Open Platform** | Seller-side only found [C] | Seller authorization flow [C] | Unknown | Not applicable (seller API) | Unknown | Not viable |
| **Lazada affiliate API** | Product search and feed reported [C] | Affiliate account [C] | Unknown | Unknown | Unknown | Research |
| **Shopee Open Platform** | Shop-level seller data only [C] | Seller account, region-dependent [C] | Unknown | Not applicable | Unknown | Not viable |
| **Third-party scrapers of marketplaces** | Exist [C] | n/a | Rights unverified; unauthorized scraping excluded by project rule | No | No | **Excluded** |
| **Open Icecat** (specs, images) | Yes (documented APIs; automated access to free content permitted [S]) | Free registration [S] | Open Content License; restrictions include not selling a brand's data; image terms not confirmed [S] | Good for specs/images if license permits display; does not appear to provide VN prices (unverified) | Unknown | **Phase 0/1 research priority** |
| **Wikimedia Commons / Wikidata** | Yes | None | Per-file license; attribution; trademark law applies separately [S] | Good for images/specs where coverage exists | Per file license | Image path, per file |
| **Manufacturer press/spec pages** | Manual only | None | Varies per brand; written permission may be needed | Good | Per brand terms | Image path, per brand |
| **Retailer pages via JSON-LD / Open Graph** | Feasible (schema.org Product/Offer) | None | Site terms and robots.txt: nothing found [—] | Unknown | Unknown | **Future** authorized extraction only |
| **Vietnamese retailer/affiliate feeds** | Unknown | Unknown | Unknown | Unknown | Unknown | **Not yet researched** (gap) |

## Findings that affect decisions

1. **Shopify Global Catalog stays a research candidate.** Its reported "no caching of results" rule conflicts with persistent cart and order snapshots. A hypothetical compatible design is *reference-only persistence* (store the provider's identifier, re-resolve live on every view, keep no price or image copy). Whether that and non-purchase use are allowed is **UNKNOWN** and needs written confirmation. It does not block the MVP.
2. **Amazon and eBay depend on commerce programs** (affiliate sales, partner approval). These conflict with a no-sales simulator and with the noncommercial hosting assumption. Revisit only with explicit terms confirmation.
3. **No marketplace seller API serves a buyer-side catalog.** Lazada and Shopee official APIs found are seller-scoped.
4. **Images are the real constraint.** Public availability of an image is not permission. The viable image paths are (a) open licenses with attribution (Commons; Open Icecat if its terms allow), (b) written permission or published press terms from the manufacturer, (c) the owner's own photography. Anything else becomes a labeled placeholder.
5. **Automated URL metadata extraction is deferred, not rejected.** It stays on the roadmap for explicitly authorized sources (ADR-003).

## Research tasks that remain (owner or network-enabled session)

| # | Task | Output |
|---|---|---|
| R1 | Read primary terms for Shopify Global Catalog, including image rules and non-purchase use | Clause quotes with URL and date |
| R2 | Read Open Icecat license and registration terms; confirm image redistribution and display | Clause quotes; decision on use |
| R3 | Read 3 candidate manufacturers' press/image terms (per chosen brand) | Per-brand rights note |
| R4 | Identify Vietnamese retailer or affiliate data programs with explicit terms | Candidate list with terms |
| R5 | Read eBay, Amazon, Lazada primary terms only if a future phase needs them | Optional |

## Verdict for the MVP

The curated catalog is a lawful path **by construction**, because the owner supplies and verifies each record. Whether it can also be visually rich depends on image rights (R2, R3, owner photography). That outcome is not yet known and is tracked as blocker B2 in `docs/PHASE1_ENTRY_CRITERIA.md`.
