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

## 3. Ports (sketch; final signatures in Phase 3/4)

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
- `script-src`: the Phase 1 spike chooses between (A) hash-based allowance for the framework's inline scripts via its experimental integrity support, or (B) `'self' 'unsafe-inline'` with the rest strict. Choose A if it works on the pinned version without fragility; otherwise B, justified by: no user-generated HTML, no server-rendered untrusted content, React escaping, and the import hardening in section 5. The framework documentation could not be read directly in Phase 0 (network allowlist), so the spike must verify against the pinned version.
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
