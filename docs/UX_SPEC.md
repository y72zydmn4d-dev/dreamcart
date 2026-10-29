# DreamCart UX Specification (Phase 2)

Status: **draft for owner design approval**. Precedence: ADRs > [PRD](PRD.md) section 3 (owner-confirmed UX direction) > this document > advisory tooling. The Phase 2 prototype implements this spec on synthetic data; it is not the storefront (P6).

> **Phase 6 update.** The prototype data is gone: home, search, product pages and the configurator now read the validated catalog through the discovery engine (`docs/CATALOG_READINESS.md`). Prices always carry their provenance line ("Giá tham khảo · ghi nhận {ngày}", a warning when old, "Giá mẫu" for synthetic fixtures); a configuration without a verified offer says "Chưa có giá"; the product page lists the merchants on record for the resolved variant only, each in its own currency, with its cart eligibility and an outbound-link notice. The loading, empty and error states live in `/design`. Everything else below is unchanged.

## 1. Direction

Premium, minimal, unmistakably DreamCart, and never a copy of anyone else.

| Surface | Reference pattern | What we take | What we do not take |
|---|---|---|---|
| Home | Apple-style editorial | Large type, whitespace, one idea per section, calm motion | Apple assets, logos, fonts, layouts, copy |
| Search | Shopee/Lazada discovery | Prominent search, suggestions, category tabs, facets with counts, chips, sort, mobile filter sheet | Ratings, "đã bán", flash sales, discount badges, countdowns, any signal we cannot source |
| Product | Apple-style product page | Big gallery, two columns on desktop, organized specs, a calm price area | Marketing claims not backed by catalog data |
| Configurator | Hybrid Continuous | All groups on one page, collapsible, revisitable, quick nav, sticky summary | A mandatory step-by-step wizard |

Identity comes from the indigo-to-violet accent (`--accent` → `--accent-2`), the conic brand mark, the soft "glow" stages behind product art, and the amber simulation band that is present on every route.

## 2. Tokens

All tokens live in `src/app/globals.css` as CSS variables mapped through Tailwind `@theme inline`. Components use semantic utilities only (`bg-surface`, `text-muted-foreground`, `shadow-card`), never raw colors. Light-first, with dark mode following `prefers-color-scheme`.

| Group | Tokens | Notes |
|---|---|---|
| Surfaces | `background`, `surface`, `muted`, `art-stage` | Near-white page, white cards, cool grey stage |
| Text | `foreground`, `muted-foreground`, `art-stage-foreground` | All ≥ 4.5:1 on their surfaces |
| Lines | `border` (decorative), `border-strong` (control boundaries, ≥ 3:1) | Inputs and option buttons use `border-strong` |
| Brand | `accent` (#5b5bd6 light / #8b8bf0 dark), `accent-2`, `accent-soft(-foreground)`, `glow-1..3` | `accent-2` and glows are decorative, never text |
| Status | `success`, `warning`, `destructive`, `simulation(-foreground, -border)` | `simulation` is reserved for virtual-transaction disclosure |
| Focus | `ring` | One 2px outline with a 2px offset on `:focus-visible` everywhere |
| Type | `text-hero`, `text-display`, `text-headline`, `text-title`, plus Tailwind base sizes | Fluid `clamp()`. Line height ≥ 1.1 so stacked Vietnamese diacritics (ễ, ổ, Ữ) never clip. Body line height 1.55 |
| Font | System stack (SF Pro, Segoe UI, Roboto, Noto Sans) | Every stack covers Vietnamese. No font files and no third-party font requests, so there is no font-licence or CSP exposure |
| Space | Tailwind 4px base, `spacing-section`, `spacing-gutter` | Container `max-w-6xl` with fluid gutter |
| Radius | `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `2xl` 32 · pills | Controls are pills or `xl`; large surfaces are `2xl` |
| Elevation | `shadow-card`, `shadow-float`, `shadow-sheet` | Soft, low-contrast; space does the work, not heavy borders |
| Motion | `duration-fast/base/slow` (150/220/320 ms), `ease-standard`, `ease-emphasized`; `animate-fade-up`, `animate-sheet-bottom`, `animate-sheet-right` | All animation and transition is cut to ~0 under `prefers-reduced-motion` |

`tests/design/tokens-contrast.test.ts` enforces the contrast pairs in both themes.

**Breakpoints:** mobile below 768px (`md`), tablet 768–1023px, desktop 1024px and up (`lg`). Layout was checked at 375, 768 and 1440px.

**Icons:** an original 24px stroke set in `src/components/ui/icons.tsx` (1.75 stroke, round caps), always `aria-hidden` next to a text label or accessible name. No emoji as icons.

## 3. Components

Only components the prototype uses exist. Primitives are in `src/components/ui`, feature components in `src/components/{layout,search,product,prototype,foundations}`.

| Component | Behaviour and states |
|---|---|
| `Button` | `default` / `secondary` / `outline` / `ghost`; sizes `sm`, `default`, `lg`, `icon`. Minimum 44px touch target. Disabled uses a muted surface with readable text, not lowered opacity. `sm` only reduces padding |
| `Badge` | `neutral`, `accent`, `success`, `warning`, `simulation`, `fixture` (dashed border = synthetic data) |
| `Sheet` | Native `<dialog>` (focus trap, Escape, inert background for free). `bottom` for mobile filters, `right` for the mobile menu. Backdrop click closes; a title and a close button are always present |
| `SearchBox` | WAI-ARIA combobox. Suggestions come only from catalog data (categories first, then products), and accents are optional ("dien thoai" finds "Điện thoại"). ↑/↓ highlight, Enter opens the highlighted item or runs a full search, Escape closes. `hero` and `compact` sizes |
| Category tabs | Toggle buttons (`aria-pressed`) with live counts |
| `FilterPanel` | Price ranges (radio) plus category-specific attributes (checkboxes) with counts. Values with zero results are disabled. With no category selected, a hint explains why attribute filters are hidden. Desktop shows a sidebar; mobile uses a bottom sheet with "Xem n kết quả" and "Xoá bộ lọc" |
| Sort | Native `<select>`: relevance, price ascending, price descending, name. There is no "bán chạy" or "đánh giá" sort because we have no data for either |
| Chips | One removable chip per active filter, plus "Xoá bộ lọc" |
| Result states | Loading skeleton (`aria-busy`), an error state with retry, an empty state with a "clear search and filters" action |
| `ProductCard` | One link per card: art, category, fixture badge, name, tagline, "Từ {giá}", and "Giá mẫu · n cấu hình" |
| `Gallery` | Large stage plus three thumbnail toggles (front, side, detail). The art tint follows the selected color. The caption states the art is illustrative |
| `Configurator` | See section 4 |
| `SimulationBanner` | Always visible, not dismissible, links to `/about` |

URL is the source of truth for search state (`q`, `category`, `price`, attribute filters, `sort`). Parameters are validated by an allow-list, and unknown values are dropped rather than echoed. Controls update optimistically and the URL follows in a transition.

## 4. Hybrid Continuous Configurator

Pure logic is in `src/modules/configurator/domain/configurator.ts` (no React, covered by the `fixtures/configurator` cases). The UI is in `src/components/product/configurator.tsx`.

- **Only real variants.** Options and availability derive solely from the product's variant list; nothing is inferred. A combination exists only if a variant has it, and prices are shown only for resolved variants (otherwise as a range or "Từ").
- **Continuous page.** Every group is visible as a collapsible section (`h3 > button[aria-expanded]`). Quick-nav chips jump to a group and move focus to its header. There is no forced order, and earlier choices stay editable at any time.
- **Dependent availability.** Each option is either *available*, *selected* or *unavailable with the current choices*. An unavailable option shows a dashed outline and its reason inline ("Không có với 13 inch, FX1"). The reason is also part of its accessible name.
- **Unavailable options stay operable.** Choosing one opens an inline `role="alert"` panel that names the conflict. It offers "Chọn X và bỏ {nhóm}", which keeps compatible choices and clears only the conflicting groups, or "Giữ nguyên". Nothing is silently substituted.
- **Single-value groups** are pre-selected, since they are the only real choice. "Chọn lại từ đầu" restores this initial state.
- **Sticky summary** ("Cấu hình của bạn") stays at the bottom of the screen. Below 640px it is a compact bar (about 64px): the lowest or exact price labeled "Giá mẫu", how many groups are missing, an expand toggle (`aria-expanded`, Escape collapses) and the CTA. Expanding reveals the full choice list, status and hint, capped at 45% of the viewport. It pads for the bottom safe area (`viewport-fit=cover`) and stops floating while an on-screen keyboard is open. From 640px up it is the full card with the exact price range. The CTA stays enabled: while groups are missing it jumps to the first one, and once complete it shows the prototype notice, because cart persistence is Phase 4.
- **Keyboard and touch.** Every option is a native button of at least 44px with `aria-pressed`. Focus order follows visual order.

## 5. Foundations for later phases (visual only)

`/design` shows static previews: cart line, checkout summary, virtual order card (`DC-V-…` id), simulated tracking timeline (6 virtual states, no courier names), My Collection card, and price states. They define layout and labeling only; their behaviour belongs to Phases 4–8. Every money surface carries the "Giá mẫu" or simulation label, and order and tracking previews say "mô phỏng".

The roadmap's full P2 list (cart drawer, confirmation, settings and export screens) is intentionally reduced to these foundations for this phase, per the Phase 2 brief.

## 6. Content rules

- Vietnamese-first copy, all in `src/platform/i18n/vi.ts`. Strings are short enough to wrap cleanly at 375px.
- **No fabricated signals:** no ratings, review counts, sold counts, discounts, stock urgency, or countdowns. The sort and filter options reflect only data we hold.
- **Synthetic data is labeled.** Prototype products are the fictional "Fixturia" brand (`src/prototype/catalog.ts`), every price is "Giá mẫu", and every page that shows them carries the "Dữ liệu mẫu" badge and notice. The smoke test enforces the notice.
- **No product photography.** Product visuals are original geometric SVGs (`ProductArt`) and cannot be mistaken for photos (ADR-010).
- Virtual transactions are disclosed on every route (ADR-001).

## 7. Accessibility baseline

WCAG 2.2 AA. This means AA token contrast and a 3:1 boundary contrast for controls, visible focus, 44px targets (inline text links excepted), skip link, landmarks, one `h1` per page, `aria-current` on navigation, native form controls, a focus-trapped modal sheet, and reduced motion. The checks run are axe-core (0 violations on all prototype routes at three widths) plus keyboard and interaction scripts. See the README.

## 8. UI/UX Pro Max (advisory)

The vendored skill (`.claude/skills/ui-ux-pro-max/`, provenance in its `UPSTREAM.md`) was consulted for this phase. Its output was weighed against section 1:

| Recommendation | Decision | Reason |
|---|---|---|
| Pre-delivery checklist: SVG icons, `cursor-pointer`, 150–300ms transitions, 4.5:1 text, visible focus, reduced motion, 375/768/1024/1440 checks | **Accepted** | Consistent with PRD and WCAG |
| Skeletons for loading, explicit empty and error states, 44px targets | **Accepted** | |
| Gold accent on near-black (#A16207 / #1C1917) | Declined | Generic luxury, not DreamCart's identity; the indigo/violet accent is retained |
| Cormorant / Montserrat (or Playfair) via Google Fonts | Declined | Third-party requests conflict with the CSP and privacy posture, and the serif display reads as fashion. The system stack covers Vietnamese |
| "Liquid Glass" refraction and translucency | Declined | Performance and contrast risk, and too close to imitating Apple platform chrome |
| Social proof and logo sections | Declined | Fabricated-signal risk (CLAUDE.md rule 5) |
| Lowered-opacity disabled styling | Declined | Fails contrast; dashed outline plus a text reason is used instead |

## 9. Preview

```bash
npm run build && npm start
```

| Route | Shows |
|---|---|
| `/` | Editorial home |
| `/search`, `/search?q=dien+thoai`, `/search?category=laptop` | Discovery, filters, sort, chips |
| `/search?demo=loading`, `/search?demo=error`, `/search?q=zzz` | Loading, error, empty states |
| `/product/fx-aero` | Dependent configurator (4 groups, sparse variants) |
| `/product/fx-nova` | Storage × color with gaps |
| `/design` | Tokens, components, later-phase foundations |

Owner sign-off on this document and the prototype is the gate for P6 (ROADMAP P2).
