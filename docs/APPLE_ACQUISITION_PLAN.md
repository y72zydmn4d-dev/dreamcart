# Apple Store Vietnam: compliant acquisition plan

**Status:** Batch 1 finding, 2026-10-30. Supersedes the assumption in the program brief that product data could be collected from `apple.com/vn` by DreamCart itself. This is an engineering record, not legal advice: where a legal question decides the outcome it is marked **owner/counsel**.

## 1. What the official sources say

Read directly on 2026-10-30 (network access to `www.apple.com` was enabled by the owner). The register `data/catalog-staging/apple-vn/inventory/compliance.json` holds the verbatim Vietnamese clauses; this is the summary.

| Source | Finding |
|---|---|
| [Website terms of use (Vietnam)](https://www.apple.com/vn/legal/terms/site.html), effective 16 May 2023 | **Automated access is prohibited**: no "deep links", page scrapers, robots, spiders or other automatic device, program, algorithm or method, "or any similar or equivalent manual process", to access, acquire, copy or monitor any part of the Site or its Content. **Copying is prohibited without written consent**: no part of the Site or Content may be copied, reproduced, republished, posted, publicly displayed or distributed (including "mirroring") to another server, website or medium for publication or distribution, or to any commercial enterprise, without Apple's express written consent. "Content" includes text, graphics and photographs, including "the selection, coordination and arrangement" of that content. Downloadable product information (such as data sheets) may be used for personal, non-commercial purposes only, not posted on any network computer. No unreasonable load on the infrastructure. Apple may change products and prices at any time and its pages may be out of date. |
| [Guidelines for Using Apple Trademarks and Copyrights](https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html) | **Photographs**: "You must obtain express written permission from Apple before using any photograph owned or licensed by Apple". Apple "does not support the use of its ... images of Apple products by other parties in marketing, promotional or advertising materials" because it may suggest endorsement. The Apple logo and Apple-owned graphic symbols need an express written licence (for example a reseller agreement). No implied endorsement, no imitation of Apple's trade dress, web design or slogans. Marks are to be spelled exactly, used as adjectives, with a trademark attribution notice. |
| [Rights and Permissions](https://www.apple.com/legal/contact/rights-permissions.html) | The route for "licensing of Apple copyrighted material (e.g., photographs ...)": an online form asking for the specific URLs, surrounding text, publisher, how Apple and its products fit the project and a deadline. Also by post to Apple Inc., Attention: Rights and Permissions, One Apple Park Way, MS 169-3IPL, Cupertino, California 95014, USA. |
| `robots.txt` | A narrow set of disallowed paths (`/*shop/browse/overlay/*`, a payments overlay path, some China paths). It is a separate signal from the terms and does not grant permission: the terms are stricter than robots.txt. |

**Conclusion.** Having network access, an open sitemap or a permissive `robots.txt` is not permission. DreamCart will not collect Apple Store Vietnam pages automatically, will not mirror its content, and will not reuse its photographs without Apple's written consent. The register records `automated_page_collection`, `manual_reading_of_public_pages` (for the purpose of building the catalog) and image reuse as **restricted**.

**Owner/counsel:** whether bare product facts (a model name, a chip, a list price) fall outside the protected "Content" is a legal question this repository does not decide. Until the owner has Apple's written consent or legal advice that settles it, nothing transcribed from `apple.com` is imported.

### What was fetched, for transparency
Single-page requests only, with a descriptive user agent and no crawling: `robots.txt` and each of the three legal pages above were requested twice (an availability check, then a download to read), and the shop sitemap index file once (it was not read or used). Fifteen or so requests in total. No product page, price, specification or image was requested or stored, and the downloaded legal pages were kept outside the repository.

## 2. Are there authorized feeds, datasets or asset sources?

Searched on 2026-10-30. Nothing verified; these are leads, recorded as `unreviewed` in the register.

| Candidate | What was found | Status |
|---|---|---|
| Apple structured product feed or API for hardware | None found. Apple's public developer APIs concern apps, subscriptions and media, not store catalogs. Reseller and partner programmes exist but were not reviewed and may require an agreement. | None identified |
| Apple affiliate or reseller photo licence | An older Apple Online Store affiliate photography guide exists (restricting photos to sales and merchandising content). Not reviewed in full; eligibility for DreamCart (a non-commercial simulator) is unknown. | Lead, ask Apple |
| Apple newsroom / press images | Download terms were not located; press use is typically editorial. Not a basis for a shopping simulator. | Not usable as found |
| Third-party price/product aggregator APIs | Exist and include images, but are not Apple-authorized and are paid. Paying needs the owner's approval (project rule 8) and the licence would have to cover public display and images. | Needs owner approval |
| Wikimedia Commons photographs of Apple products | Per-file Creative Commons licences cover the photographer's copyright only; the files carry a separate trademark notice, and Apple's trademark guidelines still apply. Each file must show the exact product and colour. | Lead, per-file review |

## 3. Paths forward

| # | Path | Unlocks | Needs | Cost / risk |
|---|---|---|---|---|
| A | **Written permission from Apple** (recommended first) | Product facts, list prices and photographs, scoped as granted; possibly a feed | Owner submits the request below; records the grant in the register (`written_permission`) | Free; reply time unknown; may be refused or narrowed |
| B | **Licensed dataset or partner programme** | A feed with a clear licence | Owner approval before any purchase; the licence must cover public display, images and refresh | Possibly paid; vendor lock-in |
| C | **Owner-original data** | A small, genuinely real pilot: products the owner owns, described in their own words, photographed by them (basis `own_work`) | Owner attestation in the register (`owner_original_data`); counsel on logos visible in photographs | Small scale; not "the complete Apple catalog" |
| D | **Open-licence images** | Real photographs for some products | Per-file review; exact product and colour; attribution; trademark caution | Patchy coverage |
| E | **Change the source strategy** | A real catalog from manufacturers or retailers whose terms or licences allow it; DreamCart's `/import` (user-entered, local, unverified) keeps working for any product | Owner decision; a new ADR per source (outside this program) | Different catalog than the Apple one envisaged |

A and C can run together: C produces a small verified set on the existing pipeline while A is pending. Neither removes the gate: every import declares its basis and is refused unless the register permits it.

## 4. Draft permission request (for the owner to send)

Submit through the Rights and Permissions form, or by post. Edit the bracketed fields. Keep the scope narrow; ask for less rather than more.

> **Subject:** Request for permission: product information and photographs of Apple products for a non-commercial shopping simulator (Vietnam)
>
> **Project.** DreamCart ([public URL]) is an independent, non-commercial virtual shopping simulator for Vietnamese users. It lets people browse real products, configure them, add them to a virtual cart, and follow a simulated order through a simulated delivery. **No real payment, order or shipment ever takes place**, and every page says so. DreamCart is not affiliated with, authorized or sponsored by Apple Inc., and will say so on every page.
>
> **What we are asking permission for.**
> 1. To display factual product information for Apple products offered on the Apple Store Vietnam (model names, configuration options, and the list price in VND as shown on apple.com/vn), written in our own words where it is descriptive, with a link back to the corresponding apple.com/vn page.
> 2. To display Apple's official product photographs for those products on DreamCart's product pages. We would use them unaltered, only for the products shown, with attribution.
> 3. To refer to Apple's product names (for example iPhone, MacBook, iPad) to identify those products, spelled exactly as in the Apple Trademark List, with the trademark attribution notice. We will not use the Apple logo.
> 4. If Apple provides a structured product feed or approved asset library for partners, to be told how to apply.
>
> **What we will not do.** Collect pages automatically, mirror apple.com, use the Apple logo or imitate Apple's design or trade dress, imply any endorsement, or offer any real purchase.
>
> **Specific material.** [List the product-page URLs and the image URLs you want, as the form asks.]
>
> **How Apple and its products fit the project.** They are the products users simulate buying. [One or two sentences.]
>
> **Publisher / project owner:** [name or organization]. **Public launch date:** [date or "not scheduled"]. **Deadline for a reply:** [date].

Record the outcome in `compliance.json`: a written grant becomes a `written_permission` entry with the date, the exact scope (which products, which fields, whether images) and the reference; a refusal updates the entries to `restricted`.

## 5. What continues without prohibited collection (Batch 1 engineering)

Done in this change, with fictional test data only:
- computer and display schemas (`desktop`, `display`; typed attributes, core counts, glass and stand), exact-variant compatibility tests, filters that follow the category, placeholder art, Vietnamese labels;
- the compliance register with the verified findings, and an **import gate**: `npm run catalog:import -- file.csv --basis <...>` refuses a basis the register does not permit, and writes to the staged catalog by default;
- the reference-price guard: only the full public price of exactly one configuration is imported (`price_kind`), never monthly, trade-in, education, promotional, bundle or "from" prices;
- staged-product activation tested: a staged catalog is served in a Preview and never in production.

Not possible yet, and not claimed: any verified Apple record, price, configuration or cleared image. Batch 1 is not complete.

## 6. Next steps

1. **Owner:** decide the path (A and C are the cheapest) and, for A, send the request.
2. **Owner:** record the decision in `compliance.json` (Claude can prepare the entry text on request).
3. **Claude, once a basis is permitted:** import owner-supplied rows through the gated pipeline into staging, validate, preview, and report counts.
