# DreamCart — Architecture (MVP)

**Status:** Phase 0 draft for owner approval (revised after self-review). Companion ADRs: 005, 006, 007, 010, 011, 012, 013, 014. Phases: `docs/ROADMAP.md`.

## 1. Shape

A **local-first modular monolith**: one Next.js (App Router, TypeScript) application. Catalog data is repository-hosted and validated at build time. Cart, orders, imported items, and settings live in the browser's IndexedDB. No authentication, no database server, no backend write API in the MVP. Supabase is deferred; the design stays compatible (section 6).

```
Browser
 ├─ Static pages (home, search shell, product)   ← prerendered at build from repo data
 └─ Client islands (cart, checkout, orders, collection, settings, search results)
        │  ports
        ▼
 Application layer ──► Domain (pure TypeScript)
        │
        ▼
 Persistence adapter: IndexedDB   (future: Supabase adapter, same ports)
```

## 2. Layers and dependency rule

Dependencies point inward only: `ui → application → domain`. Persistence adapters implement ports declared in the application layer.

- **Domain** (`modules/*/domain`): pure TypeScript. No React, Next.js, DOM, IndexedDB, `Date.now()`, or `Math.random()`. Time and ids are injected (`Clock`, `IdGenerator`). Contains: money, price state and eligibility, search matching, configurator derivation, cart logic, order snapshot builder, simulation state function, URL validation.
- **Application** (`modules/*/application`): use cases (`addToCart`, `placeOrder`, `advanceOrder`, `cancelOrder`, `exportData`, `importData`, …), port interfaces, Zod boundary schemas.
- **Infrastructure** (`platform/persistence/indexeddb`): adapters.
- **UI** (`modules/*/ui`, `app/`): React components; Next.js routes stay thin.

Modules: `catalog`, `search`, `configurator`, `pricing`, `import`, `cart`, `orders`, `simulation`, `collection`, `data-portability`. Each exposes a public `index.ts`; cross-module imports go through it. ESLint restricted-import rules enforce boundaries, and a test fails if `domain` imports a forbidden package. That is the whole modular-monolith contract.

## 3. Ports (declared in Phase 3 at `modules/orders/application/ports.ts`; adapters in Phase 4)

```ts
interface CartRepository {
  get(): Promise<Cart>;                      // includes revision and checkoutKey
  save(cart: Cart): Promise<void>;           // revision-checked
}
interface OrderRepository {
  placeOrder(cmd: PlaceOrder): Promise<PlaceOrderResult>; // atomic, idempotent
  get(id: OrderId): Promise<VirtualOrder | null>;
  list(): Promise<VirtualOrder[]>;
  advance(id: OrderId): Promise<VirtualOrder>;            // Fast scenario only
  cancel(id: OrderId): Promise<VirtualOrder>;             // state check inside the transaction
  recordHighWater(id: OrderId, state: OrderState): Promise<void>; // max() only
  delete(id: OrderId): Promise<void>;
  deleteAll(): Promise<void>;
}
interface PortabilityRepository {
  exportAll(): Promise<ExportBundle>;
  importBundle(bundle: ValidatedBundle, mode: "merge" | "replace"): Promise<ImportReport>;
}
```

Repository integration tests are written against the port, not the IndexedDB class, so a future adapter can reuse them. A formal shared "contract suite" is deferred until a second adapter exists.

### Phase 3 implementation notes

Where the written rules left room, the domain code does the following. Each is a clarification, not a rule change; the owner can veto any of them.

- **Price drift is never silent.** `placeOrder` refuses with `price_changed` when the catalog price of a cart line differs from the price the user added, instead of swapping the price. `stale_cart` is returned when the idempotency key is not the cart's current `checkoutKey` (an outdated tab). A replay for a key that already has an order returns that order even if the cart has since been emptied.
- **Search vocabulary is injected.** `searchCatalog(products, query, vocabulary)`: category aliases, colors and per-category attributes live in `BASE_VOCABULARY`; the chip vocabulary comes from the catalog (Phase 5), so the fixtures pass their own (`fx<digit>`). Optional attributes (laptop `color`, phone `chip`, audio `type`) count as defined for their category.
- **Snapshots are copies.** The order snapshot copies catalog data; later catalog changes cannot alter an order.
- **Time is milliseconds.** The simulation stores `startedAtMs`, `cancelledAtMs`, and offsets in milliseconds; Quick and Relaxed offsets are computed once at order time and stored, so changing the constants later does not alter existing orders (`scenarioVersion`).
- **Property tests** use a seeded PRNG (no new dependency) so a failing history is reproducible.

## 4. IndexedDB design

Database `dreamcart`, versioned with `onupgradeneeded` migrations. A thin wrapper (the `idb` package is the leading candidate; pin and confirm in Phase 1).

| Store | Key | Notes |
|---|---|---|
| `meta` | key | `schemaVersion`, `createdAt` |
| `cart` | `current` | lines (`variantId`, `offerId`, `quantity`, price reference), `revision` (monotonic, never reset), `checkoutKey` |
| `orders` | `id` | unique indexes `idempotencyKey` and `code`; index `createdAt`; items embed **immutable snapshots** (CATALOG_SCHEMA) |
| `userProducts` | `id` | imported/manual items, labeled unverified, never shared |
| `settings` | key | scenario default, dismissed notices |
| `quarantine` | auto | records that failed validation |

The idempotency key lives on the cart record: it is generated when the cart changes (revision increments) and when an order succeeds, so a refresh or a second tab with the same cart revision reuses the same key. There is no separate draft store.

**Durable transitions use IndexedDB transactions.** `placeOrder` is one read-write transaction over `cart` and `orders`: check the `idempotencyKey` index and return the existing order if present, otherwise insert the order with snapshots, clear the cart, rotate `checkoutKey`. `cancel` and `advance` read the order, evaluate the state with the injected clock, and write inside one transaction. Two tabs cannot both succeed because transactions and unique indexes serialize them. A `BroadcastChannel` that refreshes other tabs is an optional nicety. Every read is Zod-validated; failures go to `quarantine`.

Order id from `crypto.randomUUID()`; display code `DC-V-` plus 10 random base-32 characters; the unique `code` index decides collisions.

### Phase 4 implementation notes

What `src/platform/persistence` does where the text above leaves room. All of it is covered by the shared contract suite (run against IndexedDB and memory), IndexedDB-specific tests, and real-browser tests (`tests/browser`).

- **Native IndexedDB, no wrapper.** Stores: `meta`, `cart`, `orders` (unique `idempotencyKey` and `code`, index `createdAtMs`), `userProducts`, `settings`, `quarantine`. The database is versioned (`schema.ts`); each migration step runs in the upgrade transaction and a failure aborts the whole upgrade. A database from a newer app is reported as `schema_too_new` and is never downgraded or deleted; an upgrade blocked by another tab is reported as `blocked`; an open tab closes its connection when another tab upgrades.
- **Cart concurrency.** `save` requires the stored revision to be exactly `cart.revision - 1` (absent counts as 0), so a save built on an outdated read returns `stale_revision` with the current cart and never overwrites. `placeOrder`, import-replace and `afterOrderPlaced` each advance the revision by one, which invalidates other tabs' carts.
- **`placeOrder` is one transaction** over `cart` and `orders`: look up the idempotency key, run the domain decision, insert the order, clear the cart and rotate the key. A unique-index violation (display code or id) rolls everything back and returns `code_collision` for the use case to retry. A corrupt record under the key aborts instead of guessing.
- **Validation on every read.** Records that fail their Zod schema are copied to `quarantine` and removed from their store, never silently dropped. An invalid cart reads as an empty one; invalid settings read as defaults.
- **Failures are typed.** `StorageError.kind`: `unavailable`, `quota_exceeded`, `aborted`, `schema_too_new`, `migration_failed`, `blocked`, `corrupt_data`, `unknown`. `openPersistence` falls back to memory (data lost when the page closes; the UI must say so) only for `unavailable`, `quota_exceeded` and `unknown`; version problems are never hidden behind the fallback.
- **Backups** (`modules/data-portability`): `parseBackup` enforces a 5 MB cap, rejects `__proto__`/`constructor`/`prototype` keys and unknown fields, checks the schema, then semantic integrity (totals, unique ids/codes/keys, simulation record equals its preset, flags agree with price state) and re-validates every URL with `parseSafeUrl` (tracking parameters stripped). The device-local `checkoutKey` is never exported. **Merge** adds only non-clashing orders and reports conflicts; **replace** is only expressible with `{ confirmed: true }`, swaps everything in one transaction and advances the cart revision.
- **Deletion** is the explicit `deleteAllData()`; `meta` keeps only the schema version.
- **Not yet verified:** Firefox and WebKit run the same real-browser tests in CI only (those engines cannot be downloaded in the development container); real devices and storage eviction behaviour are Phase 10.

### Phase 7 implementation notes

- **One owner of local data in the browser:** `components/local-data/local-data.tsx` opens persistence once per page (`openPersistence`, memory fallback with a visible notice), holds the cart, imported items and quarantine list, and refreshes them when another tab commits (BroadcastChannel). Pages never open IndexedDB themselves.
- **Cart changes:** every action re-reads the stored cart, applies the pure domain function (`addLine`, `setQuantity`, `removeLine`, `acceptPrices`) and saves with the optimistic revision check. A lost race re-reads and retries (up to 3 times); the screen then says "the cart was changed in another tab". A rejected change (quantity over 99, not addable) leaves the cart untouched and says so in words.
- **Cart lines vs. the catalog:** `assessLine` (cart domain) compares a line with the offer as the catalog describes it now: `ok`, `price_changed` (the user must accept the new price before checkout can succeed, mirroring `placeOrder`), `unavailable` or `ineligible` (with the cart-block reason). Totals use the price the user saw until they accept the new one.
- **Imported items** (ADR-003): `createUserProduct` validates the draft (SafeUrl, bounded text, price parsed by currency exponent, reserved attribute names refused) and returns an `unverified` record. A cart line for an imported item uses `variantId = user-…` and `offerId = user-…@user`; its price is `USER_ENTERED` and cartable only in VND. Deleting an imported item turns its cart line into an "unavailable" line instead of removing it silently. Nothing about an imported item is fetched or rendered as an image.
- **Cart eligibility** is evaluated by `evaluateOffer` for catalog offers and by `evaluateUserProduct` for imported items; the UI never decides it.

### Phase 8 implementation notes

- **Placing an order:** the checkout page passes the checkout key of the cart it is showing. `LocalData.placeOrder` calls the Phase 4 `orders.placeOrder` transaction (idempotency lookup, domain `placeOrder`, insert order, empty cart, rotate key) with a line resolver built by `orderLineResolver` from the catalog read model and the imported items. A display-code collision retries with a new code (3 attempts). A stale key (cart changed in another tab) is refused as `stale_cart`; a repeated key returns the existing order. The order page is reached with `?placed=1` to show the confirmation banner.
- **Orders are rendered from their snapshot.** The only live lookup is the image: `renderableOrderImage` shows the stored image only while the catalog still holds that exact file as CLEARED; otherwise the placeholder tile with the "illustration, not a real product photo" note.
- **Simulated state** is `computeOrderState(record, now)` with the browser clock refreshed every 5 s for display; the stored high-water mark is raised when orders are loaded (`observeAll`). The timeline UI, the Fast control and My Collection arrive in Phase 9.
- **Data controls:** export builds the versioned backup (`exportAll`) and downloads it as a Blob; import runs the full `parseBackup` validation before anything is stored, then merge (default) or replace (needs its own confirmation); reset calls `deleteAllData` after an explicit checkbox. After a restore or reset the cart revision jumps, so the "cart changed in another tab" notice is suppressed for 3 s.
- **Lost-data notice:** a localStorage marker (`dreamcart:had-data`) is set whenever orders or imported items exist and cleared only by explicit deletion; if IndexedDB is later empty while the marker is set, a notice points to Settings and the backup restore.

### Phase 9 implementation notes

- **State is still a pure function of the stored record and a clock.** The order page re-evaluates `computeOrderState(record, now)` every 5 s for display only (`useNow`); when the displayed state is ahead of the stored high-water mark, the page calls `recordProgress` (re-reads the orders through `observeAll`, which raises the mark with `max`). A clock set backwards therefore cannot undo what was shown, and a cancelled order stays cancelled.
- **Timeline:** `OrderTimeline` renders the six states for the order's own scenario snapshot. Timed scenarios show the expected time of each step (`startedAtMs + offset`, labeled as expected); Fast shows none and advances only through `orders.advance` (one step per press, decided inside the storage transaction). `stateWhenCancelled` recovers the step a cancelled order had reached.
- **My Collection** is not stored. `CollectionExperience` filters the orders whose state is `VIRTUALLY_DELIVERED` and lists every item line of those orders once, with the same image re-check as the order page. `scheduledDeliveryMs` gives a delivery time only for timed scenarios.
- **Delivery notice:** `DeliveryNotice` (mounted under the header) announces a delivered order once; the id `delivered:<orderId>` is stored in `settings.dismissedNotices` (capped at 50, oldest dropped) when the user dismisses it or looks at the collection or that order. It is a message inside the page, not a push or system notification.
- **Journey test:** `tests/browser/journey.spec.ts` runs the 21 steps with `page.clock`, so time-based progress is deterministic in all three engines.

## 5. Storage eviction, recovery, and data portability

Browser storage is not a database you own. Known risks (reported browser behavior; verify on real devices in Phase 10):

- the user clears site data or uses private browsing;
- storage pressure can evict "best-effort" origins;
- WebKit's tracking-prevention policy is reported to delete script-writable storage for sites not interacted with for about seven days; home-screen web apps are reported to be exempt.

Mitigations in the MVP:

1. Request persistent storage (`navigator.storage.persist()`) after the first order; show the outcome in Settings. Best effort, not a guarantee.
2. **Versioned export/import** and a plain notice at first use and in Settings. After the first delivered order, show one non-recurring export hint. No reminders after that.
3. A localStorage marker detects "had data, now empty" and offers import instead of silently starting blank.
4. If IndexedDB is unavailable, fall back to memory with a persistent banner that data is lost when the page closes.
5. Corrupted records are quarantined and the app keeps working.

Limits: there is no server copy, so a lost or wiped device means lost data unless exported. Cross-device sync arrives only with the Supabase phase. **Re-evaluation trigger:** if Phase 10 device testing or the pilot shows data loss in realistic use, the owner decides whether to pull sync forward.

**Export format:** JSON `{ format: "dreamcart-export", version: 1, simulation: true, notice, exportedAt, appVersion, data: { cart, orders, userProducts, settings } }`.

**Import is untrusted input.** An export file can come from anyone. Import therefore: caps file size; parses with Zod and strips unknown keys; migrates older versions; re-validates every URL with the same validator as the import form (http/https only, so `javascript:`, `data:` and similar are rejected); accepts media paths only if they match the repository's media-path pattern; escapes all text on render; and supports `merge` (skip existing ids and idempotency keys) or `replace` (after explicit confirmation). Every stored URL is validated again at render time through a single `SafeUrl` type. This matters most if the CSP keeps inline scripts allowed (section 7), because a `javascript:` link would then execute. The export carries a simulation notice so it cannot pass as a receipt.

## 6. Compatibility with future Supabase

Ids are client-generated UUIDs; timestamps are UTC ISO; entity and field names mirror CATALOG_SCHEMA; snapshots are JSON; persistence is behind the ports. A later phase adds an adapter, authentication, row-level security, and a merge strategy through its own ADR. Nothing in the MVP depends on Supabase and nothing is provisioned.

## 7. Rendering and security headers

Catalog, home, and product pages are **prerendered at build** from repo data. Cart, checkout, orders, collection, and search results are client components. No dynamic server rendering is required.

The Content Security Policy is therefore fitted to this architecture (ADR-011): a per-request nonce would force dynamic rendering of every page, so it is not used. Baseline headers via framework configuration:

- `default-src 'self'`; `img-src 'self' data: blob:` (all product images self-hosted); `font-src 'self'`; `connect-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`.
- `script-src 'self' 'unsafe-inline'`: **decided and verified in Phase 1** (ADR-011). A nonce would force dynamic rendering, and static headers cannot carry per-page inline-script hashes, so inline scripts stay allowed while every other directive is strict. Compensating controls: no user-generated HTML, React escaping, import hardening, and `SafeUrl` for every link.
- `style-src` per Tailwind/framework needs (verify in the spike); `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` denying camera, microphone, geolocation.
- Outbound links use `rel="noopener noreferrer"` and show the "leaving DreamCart" notice.

## 8. Assets: fonts, images, budgets

- **Fonts** are self-hosted (open-license family or system stack); no third-party font requests. No proprietary platform fonts.
- **Images** are self-hosted under `public/`. Responsive sizes (for example AVIF/WebP at several widths) are **pre-generated** by a build-time script, so the app does not depend on a hosted image-optimization service. Hosted optimizers may meter usage on free tiers (to verify against the host's current terms), and the zero-cost rule makes that a risk. Budgets (targets): at most 6 images per product, each source file under 1.5 MB, each delivered variant under 250 KB; total image payload tracked in CI so the repository does not bloat.
- Editorial motion respects `prefers-reduced-motion`.

## 9. Privacy and data inventory

No account, no analytics, no third-party requests. Data on the device: cart, orders (with snapshots), imported items (which may include a user-typed URL and any query parameters the user left in), settings, a localStorage marker, and quarantined records. Nothing leaves the device unless the user exports a file or clicks an outbound link. The privacy notice states exactly this list; "Reset everything" removes all of it.

## 10. Internationalization

`platform/i18n/vi.ts` holds all UI strings as a typed object behind a small `t(key, params)` helper. No i18n library. Dates and money via `Intl` (`vi-VN`). Code identifiers, logs, and technical docs are English. English later means `en.ts` against the same key type.

## 11. Testing strategy

| Level | Tool | Covers |
|---|---|---|
| Unit | Vitest | money; price state and eligibility; search matching; configurator; cart; snapshot builder; simulation (boundaries: exactly at an offset, negative elapsed, large elapsed, clock moved backward, cancel at each state, cancel racing a transition); URL validator and `SafeUrl`. Fixtures in `fixtures/` become the core cases |
| Integration | Vitest + fake IndexedDB | repositories against the ports; concurrent `placeOrder` (same key, two callers); migrations; quarantine; export/import round trip; hostile import files (`javascript:` URLs, oversized, wrong schema, unknown keys) |
| Build-time | Node scripts | catalog validation, rights checks, required attributes, `fx-` guard |
| End to end | Playwright | full journey on desktop and mobile projects; reload and `page.clock` time-shift (verify API in Phase 1); assertion of zero cross-origin requests at checkout; per-route simulation-label check |
| Accessibility | axe via Playwright + manual | key routes; keyboard and screen reader in hardening |
| Performance | Lighthouse-style lab run | G13 targets on home, search, product |

**Browser matrix (confirm exact versions at scaffold time):** latest two stable versions of Chrome, Edge, and Firefox on desktop; Chrome on Android; Safari 16.4 or newer on macOS and iOS. Playwright projects: Chromium, Firefox, WebKit, a Pixel-class Chromium viewport, and an iPhone-class WebKit viewport. Playwright WebKit approximates Safari; real iOS devices are checked manually in Phase 10. Minimum viewport 360 px.

## 12. Tooling (decision P-9)

Private repository; Node.js 24 LTS; npm with a committed lockfile and `npm ci` in CI; Next.js stable with compatible React, Tailwind CSS, shadcn/ui, Zod, Vitest, ESLint, Prettier; TypeScript strict (held on the 6.0 line for `typescript-eslint`, ADR-005); GitHub Actions for lint, typecheck, unit/integration tests, build, and the Phase 0 spec checks. Playwright (including WebKit) is added when real user journeys exist, not in Phase 1. No deployment before Phase 12.
