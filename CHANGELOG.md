# Changelog

DreamCart is pre-release: nothing has been published to production, and the product still runs on labeled synthetic fixtures until a verified real catalog and image rights exist (see `docs/EXECUTION_STATUS.md`). Entries are grouped by phase; each phase was one pull request.

## Apple catalog program: data-source research and compatibility tests (no product data)

- `docs/APPLE_DATA_SOURCES_RESEARCH.md` evaluates nine possible legitimate sources of product records and imagery (Apple's partner programme and permission route, Open Icecat, Wikidata, Wikimedia Commons, paid aggregators, affiliate networks, retailer programmes, owner-original data). Each entry is labeled **Read** (primary page read) or **Lead** (unverified); nothing was signed up for, accepted, purchased or collected.
- Tests: a historical Fixturia order still parses, keeps the item and price paid, keeps its own simulation clock and is never re-resolved or re-priced when the active catalog changes; saved cart lines become unavailable rather than guessed; and search returns exact variants of the right category on tablets, audio and displays (an attribute the category lacks is a mismatch).

## Apple catalog program: import infrastructure (no product data)

- The importer is header-driven: one template per category (`npm run catalog:template`, `docs/templates/catalog/`), each with that category's attribute columns; a missing required column or value is reported with its row and a fix. `docs/CATALOG_IMPORT_GUIDE.md` documents every column, and a test keeps it complete.
- New import rules: a stable product id derived from manufacturer, family and model when left empty, duplicate products refused at the row, a `compatible_with` column, spec evidence required for a verified product (`Product.specEvidence`, also enforced by the catalog validator), and CLEARED images need their basis and evidence at the row.
- `npm run catalog:preflight`: the activation checklist (records, manifest reconciliation, register, image-rights bases, release gate, owner authorization). It blocks today, and activating stays the owner's separate decision.
- Manifest reconciliation: listings marked staged or published must have their product, every product must be recorded, and claimed price or image status must be backed by the catalog.

## Apple catalog program: category schemas (no product data)

- New categories `tablet`, `wearable`, `smart_home` and `accessory` with typed attributes (connectivity, case size and material, band type, size and colour, noise control, connector, device type, accessory type, length, power, package quantity, band fit) and a product-level `compatibleWith` (host brand and family, optionally a catalog product). Compatibility that is not stated stays unknown, never "universal".
- Compatibility is a multi-valued filter, is searchable ("phoneo 2" finds the accessories that fit it), and shows on the product page. Duplicate products (same manufacturer, family and model) are refused.
- URL state fixed: brand, family and compatibility values keep capitals and spaces, and numeric filters of the new categories parse as numbers.
- Tested on fictional records only: tablet configurations, watch case-and-band combinations, audio variants, accessory compatibility, unknown prices and image rights.

## Apple catalog program: Batch 1 foundations (no product data)

- The Apple website terms, copyright and trademark guidelines and the Rights and Permissions page were read directly; the verbatim findings are in the compliance register and `docs/APPLE_ACQUISITION_PLAN.md`. Automated collection, transcription and image reuse are recorded as restricted; no authorized feed or approved image source was found.
- `catalog:import` now needs a declared basis that the register permits (it refuses today) and writes to the staged catalog by default; only the full public price of exactly one configuration is imported (`price_kind`).
- New `desktop` and `display` categories with typed attributes (core counts, resolution, glass, stand), filters, labels and placeholder art; the release gate is unchanged.

## Post-MVP remediation — browser acceptance findings F01–F04

- **F01** The search price filter reported every radio as unchecked while the URL, chip and results were right: the desktop panel and the mobile sheet (always in the DOM) shared one radio group. Each panel now has its own group; there is still one URL-backed state.
- **F02** One content policy, driven by the catalog mode: with the fictional Fixturia fixtures the homepage, About page, footer, page description and source links say the products are fictional, prices are sample prices and a verified real catalog is planned, not available. A real catalog gets its own wording, so nothing has to be edited when it arrives.
- **F03** A complete configuration with no addable offer (for example Buds Lite, no price) now disables the button ("Chưa thể thêm"), prints the reason beside it and links to the merchant section, instead of offering "Thêm vào giỏ mô phỏng" and explaining after the click. Incomplete and valid configurations behave as before.
- **F04** Dark product illustrations get a neutral backlight and a light rim in the dark scheme (chosen from the body colour's luminance); the colour itself is never changed.

## Phase 12 — Release readiness

- Final acceptance report and release checklist; overall status `READY_FOR_RELEASE_REVIEW` (the real catalog, pilot and device checks are still open).
- CLAUDE.md records the owner's authorization of Vercel Preview deployments; production publication still needs explicit approval.
- `SMOKE_BASE_URL`, `SMOKE_MODE=release` and `E2E_BASE_URL` check a deployment with the existing smoke and browser suites; release builds do not publish the `/design` gallery; takedown path added to the runbook.

## Phase 11 — Pilot plan and polish

- Added the human pilot plan, consent text, task script, severity scale and report template (`docs/PILOT_PLAN.md`). The pilot itself needs people and is `PENDING_HUMAN_VALIDATION`.
- Order and collection items now read in the catalog's own words ("13 inch · Chip FX1 · 16 GB") instead of stored codes, imported items read as the user wrote them, and items show the same original illustration as the storefront.
- One Vietnamese spelling convention throughout (xoá, huỷ, hoá, tuỳ).
- The backup file picker speaks Vietnamese and shows the chosen file name; the delete-order control is a plain text action.
- README and status documents brought up to date.

## Phase 10 — QA, security and hardening (#11)

- Layout shift on home and product pages fixed (CLS 0.30 → 0.00). Lab LCP ≤ 2.1 s, slowest interaction 128 ms, about 245 kB of JavaScript.
- Failure-injection tests (no IndexedDB, full storage, corrupted records, a database from a newer version), keyboard tests, performance budgets.
- Source-hygiene guards for the `'unsafe-inline'` CSP tradeoff, production licence audit, `/privacy` page, runbook with a user backup guide, QA report. CSP re-examined: unchanged, risk recorded for the owner.
- CI split into a quality job and one browser job per engine behind the same required check; the job timeout that was cancelling runs is gone.

## Phase 9 — Virtual tracking and My Collection (#10)

- Simulated delivery timeline per scenario (Fast: you press each step; Quick ≈ 3 minutes; Relaxed ≈ 1 hour), never going backwards, cancellable only while confirmed, preparing or packed.
- My Collection derived from delivered orders, one card per delivered item; a once-per-order in-app delivery notice.
- A 21-step real-browser journey test with a controlled clock.

## Phase 8 — Virtual checkout and orders (#9)

- `/checkout` with scenario, virtual destination, payment label and a required acknowledgement; one idempotent order per cart even under double clicks and two tabs.
- Orders list and detail from stored snapshots, cancel and delete with confirmation, `/settings` with backup export, restore (merge or confirmed replace) and delete-all, and a notice when a browser that had orders is empty.

## Phase 7 — Persistent cart and manual import (#8)

- Cart on IndexedDB with cross-tab safety, per-source grouping, quantity limits, explicit acceptance of changed prices, per-currency totals.
- `/import`: paste a link, see it cleaned, store it as an unverified item; nothing is fetched.

## Phase 6 — Production storefront (#7)

- Home, search with facets and URL state, product pages with the configurator, per-variant merchant offers with provenance, credits page, shared loading, empty and error states; real-browser tests in three engines.

## Phases 0–5 — Foundation

- Specification and decisions (0), engineering foundation (1), design system and prototype (2), domain and simulation core (3), local persistence and data portability (4), catalog validation, ingestion and discovery engine (5).
