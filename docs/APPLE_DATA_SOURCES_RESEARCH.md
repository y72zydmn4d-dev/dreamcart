# Legitimate data and image sources: research (Workstream D)

**Status:** research record, 2026-10-30. **Nothing here is an authorization.** No service was signed up for, no licence or terms were accepted, nothing was purchased, and no data or image was collected from any candidate. This is an engineering record, not legal advice; where a legal question decides the outcome it is marked **owner/counsel**.

Companion to [APPLE_ACQUISITION_PLAN.md](APPLE_ACQUISITION_PLAN.md) (what Apple's own terms allow) and the register `data/catalog-staging/apple-vn/inventory/compliance.json` (where the owner records a chosen basis).

## 1. How to read this

Each candidate carries an evidence label, so a lead is never mistaken for a finding:

| Label | Meaning |
|---|---|
| **Read** | The primary page was read directly in this program (2026-10-30). |
| **Lead** | Learned from search results or general knowledge. The primary terms were **not** read. Treat every right, price and coverage statement as unverified until the owner (or Claude, when asked) reads the primary document. |

Rules applied to every candidate (project rules 5, 6 and 8, and the program brief):
- A public API, an open sitemap or a developer key is **not** permission to republish its data or images.
- "Free to join" is not "free to reuse": the licence decides, and it must cover **public display, VND prices, and images** on a public site, with refresh.
- A paid plan, a signed agreement or an accepted licence needs the owner's explicit approval first.
- Anything a candidate supplies still enters through the gated pipeline: `catalog:import --basis <...>` is refused unless the register permits that basis, and every image needs its own rights record.

## 2. Candidates

| # | Candidate | Evidence | Fits path |
|---|---|---|---|
| 1 | Apple Performance Partners (Impact) | **Read** | A |
| 2 | Apple Rights and Permissions request | **Read** | A |
| 3 | Open Icecat / Icecat product data | Lead | B |
| 4 | Wikidata | Lead | D (facts only) |
| 5 | Wikimedia Commons photographs | Lead (also in the acquisition plan) | D |
| 6 | Paid price/product aggregators | Lead | B |
| 7 | Vietnamese retailer affiliate networks and retailer feeds | Lead | B / E |
| 8 | Global retailer programmes (product-advertising APIs) | Lead | B |
| 9 | Owner-original data and photography | n/a (owner decision) | C |

### 1. Apple Performance Partners (managed by Impact) — **Read**
- **Provider / source:** Apple, via the Impact partner platform. Pages read: `apple.com/shop/performance-partners` and the `/vn/` variant.
- **Data coverage:** None advertised as a data feed. The programme provides referral links and "marketing assets"; the pages mention no product catalog, price or specification feed.
- **Usage rights:** Commercial referral programme: partners earn commissions on sales that Apple processes. Partners agree to Apple's Performance Partner terms (shown during the application, not public).
- **Image rights:** Only "approved marketing assets produced by Apple", available after acceptance, and "not allowed to alter them in any way". Use is governed by Apple's Brand and Photography Guidelines. The scope for a non-selling simulator is unknown.
- **Cost:** Free to join.
- **API / feed:** None described. Impact itself is a tracking and asset platform.
- **Restrictions:** Selective ("your site must drive significant revenue", "a limited number of partners"); review of about two weeks; **partners cannot take orders** ("Apple will process all orders directly"); links must carry the partner ID; the partner must give Apple "a prominent presence" and drive sales. DreamCart is a virtual simulator with no real checkout, so the programme's premise (driving real sales) does not match, and the site may not qualify.
- **Suitability for DreamCart:** **Low / unlikely.** Applying is an owner decision (it involves accepting terms on the owner's behalf). If the owner wants to try, the honest description is "non-commercial simulator"; DreamCart must not misdescribe itself to qualify.

### 2. Apple Rights and Permissions request — **Read**
- **Provider:** Apple Inc., Rights and Permissions (online form or post). Process described at `apple.com/legal/contact/rights-permissions.html`.
- **Data coverage:** Whatever Apple grants in writing; the form asks for specific URLs, surrounding text, publisher, how Apple's products fit the project and a deadline.
- **Usage rights / image rights:** Set entirely by Apple's written reply. This is the only route the terms name for photographs ("express written permission") and for copying site Content.
- **Cost:** None stated. **Reply time:** unknown. **Outcome:** may be refused, narrowed, or conditional (attribution, no logo, no endorsement).
- **API / feed:** none by default; the draft request asks whether a partner feed or asset library exists.
- **Restrictions:** whatever the grant says, plus Apple's trademark guidelines.
- **Suitability:** **The best first step and the only one that can unlock Apple's own photographs.** A draft request is in the acquisition plan §4; the owner sends it and records any grant as a `written_permission` entry (date, exact scope, reference).

### 3. Open Icecat / Icecat product data — Lead
- **Provider:** Icecat (a product-content syndication service). It publishes manufacturer-supplied specifications and images, with a free "Open Icecat" tier and paid "Full Icecat" tiers.
- **Data coverage:** Worldwide consumer-electronics specifications and images, with multilingual descriptions that may include Vietnamese for some products. Whether Apple and Beats products are in the open tier, and whether models sold in Vietnam are covered, was **not verified**. Open tiers have historically excluded some brands.
- **Usage rights:** Governed by Icecat's own licence for the open tier (an "Open Icecat" content licence with conditions) and, for paid access, a contract. Whether public republication in a shopping simulator is within the licence was **not verified**. **Owner/counsel** to read it.
- **Image rights:** Images are manufacturer-supplied and licensed by Icecat under its terms; the rights Icecat can grant over a *manufacturer's* photographs, especially Apple's, are exactly the question to check.
- **Cost:** Open tier reported as free with registration; paid tiers exist (prices not verified). Registration or a contract needs the owner's approval.
- **API / feed:** XML and JSON interfaces exist (lead).
- **Restrictions:** Not verified. Expect attribution, no-resale or no-bulk-redistribution conditions, and brand-specific carve-outs.
- **Suitability:** **Medium, pending the licence.** Provides *specifications* (variants, dimensions, chips) well; does **not** provide Vietnamese retail *prices*, which still need a merchant source (candidates 6, 7). Not an Apple-authorized source.

### 4. Wikidata — Lead
- **Provider:** Wikimedia Foundation. Structured data under a CC0 public-domain dedication (the Wikidata main data, documented by Wikimedia).
- **Data coverage:** Sparse and uneven for individual product *models*. It names product lines, release dates and manufacturers, but rarely holds orderable configurations, GTINs for variants, or prices. Not a catalog.
- **Usage rights:** CC0 for the data itself (lead; confirm on the Wikidata licensing page).
- **Image rights:** Wikidata links to Commons files; each file keeps its own licence (see 5).
- **Cost:** Free. **API:** SPARQL endpoint and REST API, subject to Wikimedia's usage policy.
- **Restrictions:** Wikimedia's user-agent and rate expectations; CC0 covers the data, **not** trademarks.
- **Suitability:** **Low as a catalog; fine as a cross-check** for names, release years and family relations. Never a source of prices or orderable configurations.

### 5. Wikimedia Commons photographs — Lead
- **Provider:** Wikimedia Commons contributors. Per-file licences (CC BY, CC BY-SA, public domain, others).
- **Data coverage:** Patchy: some products have photographs, many do not, and a photograph of "an iPhone" is not a photograph of **this model in this colour** (a variant-accuracy problem for a configurator).
- **Usage rights:** The photographer's copyright is licensed per file; some licences require attribution and share-alike. A separate trademark notice often applies, and Apple's trademark guidelines still apply to the depicted product and any visible logo.
- **Image rights:** Each file must be reviewed individually and recorded in the media registry with basis, licence, author and attribution text. **Never bulk-import.** The existing image gate (`CLEARED` only with an evidence note) already enforces a per-file record.
- **Cost:** Free. **API:** MediaWiki API (rate and user-agent policy applies).
- **Restrictions:** attribution; share-alike where applicable; must match the exact product and colour or use the neutral placeholder; **owner/counsel** to decide whether a visible Apple logo in a CC-licensed photo is acceptable.
- **Suitability:** **Medium for a few hero images; not a route to full coverage.** Honest metric: images stay `placeholder` for everything not individually cleared.

### 6. Paid price and product aggregators — Lead
- **Provider examples (not endorsements, none contacted):** commercial product-data and price-comparison APIs (for example ShopSavvy-style services). Their catalogs and terms differ.
- **Data coverage:** Vendors typically claim large product and offer coverage; **Vietnam coverage** and Apple's specific models in VND were not verified. Many cover a few Western markets.
- **Usage rights:** Commercial contract; many forbid redistribution, caching beyond a short window, or display beyond the vendor's attribution rules. A public simulator showing VND prices needs a clause for **display and persistence**, and DreamCart's order snapshots persist prices (snapshots are local, but still stored).
- **Image rights:** Often "as provided by merchants", with the vendor disclaiming rights to the images. Not a grant of Apple's photography.
- **Cost:** Usually paid subscriptions. **Needs the owner's approval before any sign-up or purchase** (project rule 8).
- **API / feed:** REST APIs.
- **Restrictions:** rate limits, caching limits, redistribution bans, attribution.
- **Suitability:** **Low to medium, owner decision.** Even where it works, it supplies prices and links, not display rights over images.

### 7. Vietnamese retailer affiliate networks and retailer feeds — Lead
- **Provider examples (leads only):** local performance-marketing networks (for example AccessTrade Vietnam) that distribute product feeds or deep-link tools for merchants who opt in; individual retailers' own affiliate or partner pages.
- **Data coverage:** Per merchant, and only for merchants that join. Whether Apple-authorized resellers publish *Apple* product feeds there was **not verified**; many brand-restricted listings carry extra rules.
- **Usage rights:** Affiliate terms normally permit promotional display of the merchant's product data **for the purpose of driving referral traffic**. A virtual shopping simulator is not promotional selling; whether the terms fit is unknown. **Owner/counsel** to read the merchant and network terms.
- **Image rights:** Usually "merchant-provided creative for promotion", often with usage bans outside the affiliate relationship, and brand images subject to the brand's own rules (Apple's, again).
- **Cost:** Typically free to join; commission-based. Joining is an acceptance of terms, so it needs the owner's approval; approval by the merchant is not guaranteed.
- **API / feed:** product feeds and link tools (lead).
- **Restrictions:** traffic-quality rules, prohibited brand-bidding, disclosure obligations, and a premise that visitors go on to buy (which DreamCart does not offer).
- **Suitability:** **Possible for non-Apple third-party accessories; unlikely for Apple's own products and photographs.** The Apple catalog case remains with candidates 1, 2 and 9.

### 8. Global retailer programmes (product-advertising APIs) — Lead
- **Provider examples:** large global marketplaces offer affiliate product-advertising APIs. Their terms generally limit use to the affiliate relationship, require purchase-linking and often forbid caching, bulk copying or display outside the programme.
- **Data coverage:** Marketplace listings in the relevant storefronts; no Apple Store Vietnam list prices (a different seller and currency).
- **Usage rights / image rights:** Programme-specific and usually restrictive.
- **Cost:** Free to join, commission-based; acceptance of terms needs the owner's approval.
- **Suitability:** **Not suitable** for "Apple Store Vietnam list price" data, and a poor fit for a non-selling simulator.

### 9. Owner-original data and photography
- **Provider:** the owner (or people who have given written permission).
- **Data coverage:** Exactly what the owner can describe and photograph: a small set of real products the owner owns or can observe lawfully, in the owner's own words, with prices observed lawfully and recorded with observer and evidence.
- **Usage rights / image rights:** The owner's, via the `own_work` basis and a recorded attestation. Logos in photographs and product-shape trademarks remain **owner/counsel** matters.
- **Cost:** The owner's time. **API:** the curation CSV templates (`docs/templates/catalog/`) and `catalog:import`.
- **Restrictions:** price statements must be the full public list price of exactly one configuration (`price_kind`); the data is limited to what is honestly observed.
- **Suitability:** **High for a small, genuine pilot; it is not the complete catalog.** It can run in parallel with a pending Apple request.

## 3. Ranking and what it unlocks

| Goal | Best path (in order) | Honest limit |
|---|---|---|
| Apple's own photographs | 2 (written permission) → 1 (if eligible) | Only Apple can grant this; no third-party source clears Apple's photographs |
| Apple specifications and variants | 2 → 3 (if licence fits) → 9 | Specs may be factual, but the Apple terms treat the site's "selection, coordination and arrangement" as Content; counsel's call |
| VND list prices | 2 → 9 (observed lawfully) → 6/7 (if licence fits display) | No candidate verified as a VND list-price source |
| Third-party accessories | 7 (merchants that opt in) → 3 → 9 | Per-merchant terms; images still per-file |
| A few real photographs without Apple | 5 (per-file) → 9 | Variant accuracy and trademark caution |

None of the above lets DreamCart claim the complete Apple Store Vietnam catalog. Coverage reporting keeps inventory, verification, price and image metrics separate, and reports **no percentage** until completeness has been attested.

## 4. What the owner can do next (all optional, none required for engineering)

1. **Send the Rights and Permissions request** (draft in the acquisition plan §4). Cheapest, and the only route to Apple's photographs.
2. **Decide whether to read** the Open Icecat licence and one Vietnamese affiliate network's terms. Claude can read these primary documents and summarize them on request; reading is not accepting.
3. **Record any decision** in `compliance.json` (`written_permission`, `documented_structured_feed`, `licensed_dataset`, `owner_original_data` or `open_license_images`). Until a basis is permitted there, the importer refuses it.
4. **Approve or decline** any paid service explicitly; none has been contacted.

## 5. What was and was not done in this research

- **Read directly:** Apple Performance Partners pages (US and Vietnam), saved outside the repository; Apple's legal pages (see the acquisition plan).
- **Search only (leads):** Apple affiliate programme descriptions, Open Icecat, Wikidata licensing, Vietnamese affiliate networks. The primary terms were not opened for these.
- **Not done:** no sign-up, no application, no licence acceptance, no purchase, no API call to any candidate, no download of any product page, price or image, and no contact with any provider.
