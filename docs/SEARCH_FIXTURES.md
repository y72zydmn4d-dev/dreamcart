# Search Matching Rules and Test Fixtures

**Status:** Phase 0 specification. Implementation is Phase 1.
**Files:** `fixtures/search/fixture-catalog.json` (synthetic catalog), `fixtures/search/queries.json` (30 fixtures with expected output).

All fixture data is **synthetic** (fictional brand "Fixturia", ids prefixed `fx-`). It tests logic only and is never real product information. A production build must fail if any `fx-` id is present in the shipped catalog.

## Principle

Explicit attributes in a query (screen, chip, RAM, storage, color) are **hard constraints**. A variant is returned as an exact match only if every constraint is satisfied by a *known* value. A missing value means *unknown*, never matched. Text similarity may rank and select products, but never relaxes a constraint.

## Rules (deterministic, in order)

1. **Normalize** the query: Unicode NFD, strip combining marks, `đ`→`d`, lowercase, curly quotes→`"`, collapse whitespace.
2. **Memory tokens**: `<number>(gb|tb)`, optionally adjacent to a label `ram` or `ssd` (label before the number wins over a label after). `tb` = ×1024 GB. Bare numbers without a unit are text tokens, never inferred as memory.
3. **Screen**: `<number>` followed by `inch`, `-inch`, `in`, or `"`.
4. **Category aliases** (longest first, one per query): laptop → `may tinh xach tay`, `may tinh`, `laptop`, `notebook`; phone → `dien thoai`, `smartphone`, `phone`; audio → `tai nghe`, `headphones`, `headphone`, `earbuds`. A match sets a category filter and is removed from the text tokens.
5. **Colors** (query token → value): `black`, `white`, `silver`, `graphite`, `sand`, `den`→black, `trang`→white, `bac`→silver. **Chip**: token matching `fx<digit>` (fixture vocabulary; the real vocabulary comes from the catalog).
6. **Text tokens** are the remainder. If there are no text tokens and no category alias: `empty_query` (blank input) or `query_too_broad`.
7. **Product candidates**: every text token must match at least one token of `brand + family + model` by: exact; prefix (query token length ≥ 3); or one edit (Damerau–Levenshtein/OSA distance ≤ 1, query token length ≥ 5). A category filter excludes other categories.
8. **Resolving unlabeled memory tokens per candidate category** (laptop has both RAM and storage; phone has storage; audio has neither):
   - Laptop, two unlabeled: smaller = RAM, larger = storage. One unlabeled plus one labeled: the unlabeled takes the other attribute. One unlabeled alone, or any other combination: **ambiguous**.
   - Phone: one unlabeled = storage; more than one: ambiguous.
   - Attribute not defined for the category (for example a RAM constraint on a phone): never satisfiable.
9. **Per-variant check** for each constraint: `match`, `mismatch`, or `unknown` (attribute missing on the variant). A variant is exact only if all are `match`.
10. **Per-product class**:
    - `match`: at least one exact variant. `variantIds` = exact variants in catalog order.
    - `ambiguous`: rule 8 ambiguity. `variantIds` = [], reasons `["ambiguous_gb"]`. Nothing is called exact.
    - `near`: product text matched but no exact variant. `variantIds` = []. Reasons, sorted alphabetically: for every constraint that no variant matches, `constraint_unknown:<attr>` if at least one variant is unknown for it, else `constraint_unavailable:<attr>`. If every constraint is individually satisfiable, the single reason `combination_unavailable`.
11. **Result status**: `results`, `no_match`, `query_too_broad`, or `empty_query`.
12. **Order**: class (`match`, `ambiguous`, `near`), then coverage (matched distinct product tokens ÷ distinct product tokens, descending), then `productId` ascending.

The UI must present `near` and `ambiguous` results as "not an exact match" with the reasons, and must never preselect a different variant on the user's behalf.

## Fixtures

| ID | Query | Behavior under test |
|---|---|---|
| F01 | `fixturia aero` | text only, all variants |
| F02 | `aero 13 inch 16gb 512gb` | two unlabeled memory tokens |
| F03 | `aero 13" fx2 16gb ram 512gb ssd` | inch mark, chip, labeled memory |
| F04 | `aero 15 inch 8gb 256gb` | constraints individually present, combination absent |
| F05 | `aero 14 inch` | screen size not offered |
| F06 | `aero 32gb ram 1tb ssd` | TB conversion |
| F07 | `titan 1tb` | ambiguous single memory token on laptop |
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

## Validation performed in Phase 0

Expected results were written by hand from the rules before any checker ran. A throwaway reference implementation of rules 1–12 (not committed; Phase 1 builds the real one) agreed with 30/30 fixtures, and a deliberately altered fixture was correctly reported as a failure. This shows the rules are internally consistent and deterministic. It does not show real-catalog accuracy: the real catalog will need its own attribute vocabularies, and the fixtures must be re-run against them in Phase 1/2.

## Known limits (accepted for MVP)

Only the attribute types above are parsed. Synonyms beyond the alias lists, non-adjacent labels (`ram ... 16gb`), ranges, and negations are unsupported. Real categories add attributes (for example headphone type), which extend the grammar through a per-category attribute vocabulary, not through fuzzy logic.
