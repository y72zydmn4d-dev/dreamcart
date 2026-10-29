# Search Matching Rules and Test Fixtures

**Status:** Phase 0 specification (revised after self-review). Implementation is Phase 3 (domain core).
**Files:** `fixtures/search/fixture-catalog.json` (synthetic catalog), `fixtures/search/queries.json` (fixtures with expected output). Related: `fixtures/pricing/`, `fixtures/configurator/`. They run as Vitest suites (`npm test`): `src/modules/search/domain/search.test.ts`, `src/modules/pricing/domain/price.test.ts`, `src/modules/cart/domain/cart.test.ts`, `src/modules/configurator/domain/configurator.test.ts`.

All fixture data is **synthetic** (fictional brand "Fixturia", ids prefixed `fx-`). It tests logic only and is never real product information. A production build must fail if any `fx-` id is in the shipped catalog. The fixture catalog deliberately contains two variants that production validation would reject (a laptop variant without `storage_gb`, an audio variant without `color`), so the "unknown" behavior can be tested.

## Principle

Explicit attributes in a query are **hard constraints**. A variant is exact only if every constraint is satisfied by a *known* value. A missing value means *unknown*, never matched. Contradictory constraints are never resolved silently. Text similarity may select and rank products but never relaxes a constraint.

## Rules (deterministic, in order)

1. **Normalize**: Unicode NFD, strip combining marks, `đ`→`d`, lowercase, curly quotes→`"`, collapse whitespace.
2. **Memory tokens**: `<number>(gb|tb)`. A label (`ram` or `ssd`) immediately **before** the number binds to it. If there is no leading label, a label immediately **after** the number binds to it and is consumed; a trailing label is never consumed when a leading label exists (so `ssd 512gb ram 16gb` reads as SSD 512, RAM 16). `tb` = ×1024 GB. Bare numbers are text tokens. **Shorthand (decision P-6):** `<number>g` and `<number>t` (no space) are memory only when the number is a plausible size: `g` for 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 512; `t` for 1, 2, 4, 8. So `128G` is 128 GB and `1T` is 1 TB, while `5G` and `4G` (network generations) stay ordinary text tokens and match nothing.
3. **Screen**: `<number>` followed by `inch`, `-inch`, `in`, or `"`.
4. **Category aliases** (longest first, one per query): laptop → `may tinh xach tay`, `may tinh`, `laptop`, `notebook`; phone → `dien thoai`, `smartphone`, `phone`; audio → `tai nghe`, `headphones`, `headphone`, `earbuds`. A match filters by category and is removed from the text tokens.
5. **Colors**: `black`, `white`, `silver`, `graphite`, `sand`, plus `den`→black, `trang`→white, `bac`→silver. **Chip**: token matching `fx<digit>` (fixture vocabulary; the real vocabulary comes from the catalog).
6. **Text tokens** are the remainder. With no text tokens and no category alias: `empty_query` (blank input) or `query_too_broad`.
7. **Product candidates**: every text token must match a token of `brand + family + model` by: exact; prefix (query token length ≥ 3); or one edit (OSA distance ≤ 1, query token length ≥ 5). A category alias excludes other categories.
8. **Resolving memory tokens per candidate category** (laptop has RAM and storage; phone has storage; audio has neither):
   1. labeled tokens bind to their attribute;
   2. unlabeled `tb` tokens bind to storage (RAM is not expressed in TB);
   3. remaining unlabeled GB tokens bind only when their count equals the number of free memory attributes: one token and one free attribute binds to it; two tokens and two free attributes bind smaller = RAM, larger = storage. Anything else is **ambiguous**;
   4. on a category with no memory attributes, memory tokens bind to `storage_gb` and are therefore never satisfiable.
9. **Conflicts**: after binding, an attribute with two different requested values (two screen sizes, two colors, two chips, two RAM sizes…) is a conflict. Repeated identical values collapse.
10. **Per-variant check** for each constraint: `match`, `mismatch`, or `unknown` (attribute missing on the variant); an attribute not defined for the category is always `mismatch`. A variant is exact only if all are `match`.
11. **Per-product class**:
    - `ambiguous`: rule 8 ambiguity and/or a rule 9 conflict. `variantIds` = [], reasons from `ambiguous_gb`, `conflicting:<attr>` (sorted). Nothing is called exact.
    - `match`: at least one exact variant. `variantIds` = exact variants in catalog order.
    - `near`: product text matched but no exact variant. `variantIds` = []. Reasons, sorted: for every constraint no variant matches, `constraint_unknown:<attr>` if at least one variant is unknown for it, else `constraint_unavailable:<attr>`; if every constraint is individually satisfiable, the single reason `combination_unavailable`.
12. **Result status**: `results`, `no_match`, `query_too_broad`, or `empty_query`.
13. **Order**: class (`match`, `ambiguous`, `near`), then coverage (matched distinct product tokens ÷ distinct product tokens, descending), then `productId` ascending.

UI obligations: present `near` and `ambiguous` results as "not an exact match" with the reasons; never preselect a different variant; for `ambiguous_gb` offer explicit choices ("16GB RAM" / "16GB SSD").

## Fixtures

Expected results live in `fixtures/search/queries.json`. F31–F37 were added in the Phase 0 self-review, F38–F42 for decision P-6.

| ID | Query | Behavior under test |
|---|---|---|
| F01 | `fixturia aero` | text only, all variants |
| F02 | `aero 13 inch 16gb 512gb` | two unlabeled memory tokens |
| F03 | `aero 13" fx2 16gb ram 512gb ssd` | inch mark, chip, labeled memory |
| F04 | `aero 15 inch 8gb 256gb` | each constraint present, combination absent |
| F05 | `aero 14 inch` | screen size not offered |
| F06 | `aero 32gb ram 1tb ssd` | TB conversion |
| F07 | `titan 1tb` | TB means storage; missing storage is unknown |
| F08 | `titan 32gb ram 1tb ssd` | variant with missing storage not matched |
| F09 | `titan 32gb ram 512gb ssd` | unknown storage reason |
| F10 | `titan 16 inch` | constraint satisfied by all variants |
| F11 | `nova 256gb` | phone storage, sibling product near |
| F12 | `nova 5 256gb graphite` | storage + color, ranking |
| F13 | `nova 5 512gb sand` | combination vs. unavailable reasons |
| F14 | `nova 5 mini` | extra model token excludes sibling |
| F15 | `dien thoai nova` | Vietnamese category alias, coverage order |
| F16 | `điện thoại nova 5 128gb` | diacritic normalization |
| F17 | `tai nghe fixturia` | audio alias, tie-break by id |
| F18 | `buds pro 2 đen` | Vietnamese color alias, unknown color not matched |
| F19 | `buds pro 2 white` | English color |
| F20 | `buds pro 2 silver` | absent color with unknown variant |
| F21 | `buds black` | shared family token |
| F22 | `studio 700 silver` | numeric model token |
| F23 | `studio 700 white` | unavailable color |
| F24 | `fixtruia aero` | transposition typo |
| F25 | `aeroo 13 inch` | extra-letter typo + screen filter |
| F26 | `aer 13 inch` | prefix match |
| F27 | `zzz` | no match |
| F28 | `16gb 512gb` | query too broad |
| F29 | three spaces | empty query |
| F30 | `laptop 16gb ram 512gb ssd` | category-only query with constraints |
| F31 | `aero 13 inch 16gb 512gb fx3` | nonexistent chip |
| F32 | `aero 13 inch 15 inch` | contradictory screen sizes |
| F33 | `buds black white` | contradictory colors, two products |
| F34 | `aero ssd 512gb ram 16gb` | leading label does not consume the next label |
| F35 | `titan 32gb` | single unlabeled GB on a laptop stays ambiguous |
| F36 | `nova 5g 128gb` | `5g` is not memory; honest no-match |
| F37 | `aero 1tb 16gb` | TB plus unlabeled GB, combination absent |
| F38 | `nova 256g` | shorthand `G` = GB (P-6) |
| F39 | `aero 16g 512g` | two shorthand tokens, smaller is RAM |
| F40 | `titan 1t` | shorthand `T` = TB, storage |
| F41 | `nova 4g 128gb` | `4G` network generation is not memory |
| F42 | `titan 32g ram 1t` | shorthand with trailing label |

## Validation performed (what it does and does not show)

- Expected results were written by hand from the rules, then checked by a dependency-free reference script. Phase 3 re-implemented the rules as typed domain code (`src/modules/search/domain/search.ts`), ran every fixture against it as a Vitest suite, and deleted the script. Mutating a rule in the domain code makes the suite fail, so a pass is not vacuous.
- **The self-review found real defects the first 30 fixtures missed.** The original rules let the *last* value win for contradictory constraints (`aero 13 inch 15 inch` silently matched 15-inch variants; `buds black white` silently matched white), and treated `titan 1tb` as ambiguous. These are fixed (rules 8, 9, 11) and covered by F32, F33, F07.
- **Not shown:** accuracy on a real catalog, real attribute vocabularies, performance, or behavior on queries nobody thought of. Phase 3 must re-implement the rules as typed domain code, run these fixtures as unit tests, and extend them with fixtures drawn from the real curated catalog.

## Known limits (accepted for MVP)

Only the attribute types above are parsed. Unsupported: synonyms beyond the alias lists, non-adjacent labels (`ram ... 16gb`), ranges, negations, and shorthand outside the plausible-size lists (an uncommon size such as `20G` is not memory and returns no match rather than a guess). A color word that is also part of a product name would be read as a color. Real categories add attributes (for example headphone type) through per-category vocabularies, never fuzzy logic.
