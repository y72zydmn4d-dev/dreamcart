import { normalizeText } from "@/modules/shared/domain/text";

/**
 * Deterministic exact-variant search (ADR-014, docs/SEARCH_FIXTURES.md). Explicit attributes in a query are
 * hard constraints; a missing value is unknown, never matched; contradictory constraints are never resolved
 * silently. There is no ranking by popularity and no AI.
 */

export type Category = "laptop" | "phone" | "audio";
export type AttributeValue = string | number;

export interface SearchVariant {
  readonly id: string;
  readonly attributes: Readonly<Record<string, AttributeValue | undefined>>;
}

export interface SearchProduct {
  readonly id: string;
  readonly brand: string;
  readonly family: string;
  readonly model: string;
  readonly category: Category;
  readonly variants: readonly SearchVariant[];
}

export type MatchClass = "match" | "ambiguous" | "near";

export interface SearchResult {
  readonly productId: string;
  readonly class: MatchClass;
  /** Exact variants for `match`; always empty for `near` and `ambiguous` (never a substitute). */
  readonly variantIds: readonly string[];
  /** Machine-readable reasons for `near` and `ambiguous`, sorted. */
  readonly reasons: readonly string[];
}

export type SearchStatus = "results" | "no_match" | "query_too_broad" | "empty_query";

export interface SearchOutcome {
  readonly status: SearchStatus;
  readonly results: readonly SearchResult[];
}

/**
 * Per-catalog vocabulary. Category aliases and colors follow the written rules; the chip vocabulary
 * comes from the catalog (Phase 5), so it is injected rather than hard-coded here.
 */
export interface SearchVocabulary {
  readonly categoryAliases: Readonly<Record<Category, readonly string[]>>;
  /** Normalized color word -> canonical color value. */
  readonly colors: Readonly<Record<string, string>>;
  /** Attributes that exist for each category; any other attribute is a mismatch. */
  readonly categoryAttributes: Readonly<Record<Category, readonly string[]>>;
  /** True when a normalized token names a chip in the catalog being searched. */
  readonly isChip: (token: string) => boolean;
}

export const BASE_VOCABULARY: SearchVocabulary = {
  categoryAliases: {
    laptop: ["may tinh xach tay", "may tinh", "laptop", "notebook"],
    phone: ["dien thoai", "smartphone", "phone"],
    audio: ["tai nghe", "headphones", "headphone", "earbuds"],
  },
  colors: {
    black: "black",
    white: "white",
    silver: "silver",
    graphite: "graphite",
    sand: "sand",
    den: "black",
    trang: "white",
    bac: "silver",
  },
  categoryAttributes: {
    laptop: ["screen_in", "chip", "ram_gb", "storage_gb", "color"],
    phone: ["storage_gb", "color", "chip"],
    audio: ["type", "color"],
  },
  isChip: () => false,
};

interface MemoryToken {
  readonly gb: number;
  readonly unit: "gb" | "tb";
  readonly label: "ram" | "ssd" | null;
}

interface ParsedQuery {
  readonly text: readonly string[];
  readonly values: ReadonlyMap<string, ReadonlySet<AttributeValue>>;
  readonly memory: readonly MemoryToken[];
  readonly categoryHint: Category | null;
}

// Shorthand `128G` / `1T` (no space) counts as memory only for plausible sizes (decision P-6), so network
// generations such as `5G` and `4G` stay ordinary text.
const SHORT_GB = new Set([8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 512]);
const SHORT_TB = new Set([1, 2, 4, 8]);

/** Rule 2. A label before the number wins; a label after it is consumed only when none precedes it. */
function extractMemory(query: string): { rest: string; memory: MemoryToken[] } {
  const re = /(?:\b(ram|ssd)\s+)?(\d+(?:\.\d+)?)(?:\s*(gb|tb)|(g|t))(?![a-z0-9])/g;
  const memory: MemoryToken[] = [];
  let rest = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(query))) {
    const n = Number(m[2]);
    const unitText = (m[3] ?? m[4])!;
    const unit: "gb" | "tb" = unitText.startsWith("t") ? "tb" : "gb";
    if (m[4] && !(unit === "tb" ? SHORT_TB : SHORT_GB).has(n)) continue;
    rest += query.slice(last, m.index) + " ";
    last = re.lastIndex;
    let label = (m[1] as "ram" | "ssd" | undefined) ?? null;
    if (!label) {
      const trailing = /^\s+(ram|ssd)\b/.exec(query.slice(last));
      if (trailing) {
        label = trailing[1] as "ram" | "ssd";
        last += trailing[0].length;
        re.lastIndex = last;
      }
    }
    memory.push({ gb: n * (unit === "tb" ? 1024 : 1), unit, label });
  }
  return { rest: rest + query.slice(last), memory };
}

const addValue = (map: Map<string, Set<AttributeValue>>, key: string, value: AttributeValue) => {
  const set = map.get(key) ?? new Set<AttributeValue>();
  set.add(value);
  map.set(key, set);
};

function parseQuery(query: string, vocab: SearchVocabulary): ParsedQuery {
  const extracted = extractMemory(normalizeText(query));
  let q = extracted.rest;
  const values = new Map<string, Set<AttributeValue>>();

  // Rule 3: screen size.
  q = q.replace(/(\d+(?:\.\d+)?)\s*(?:-\s*)?(?:inch(?:es)?|in|")(?![a-z0-9])/g, (_, n: string) => {
    addValue(values, "screen_in", Number(n));
    return " ";
  });

  // Rule 4: one category alias per query, longest first.
  let categoryHint: Category | null = null;
  const aliases = (Object.entries(vocab.categoryAliases) as [Category, readonly string[]][])
    .flatMap(([category, list]) => list.map((alias) => [category, alias] as const))
    .sort((a, b) => b[1].length - a[1].length);
  for (const [category, alias] of aliases) {
    const re = new RegExp(`(^| )${alias}( |$)`);
    if (re.test(q)) {
      categoryHint = category;
      q = q.replace(re, " ");
      break;
    }
  }

  // Rule 5: colors and chips; rule 6: the remainder is text.
  const text: string[] = [];
  for (const word of q
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)) {
    const color = vocab.colors[word];
    if (color !== undefined) addValue(values, "color", color);
    else if (vocab.isChip(word)) addValue(values, "chip", word);
    else text.push(word);
  }
  return { text, values, memory: extracted.memory, categoryHint };
}

const tokensOf = (s: string): string[] =>
  normalizeText(s)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

/** Optimal-string-alignment distance (Damerau–Levenshtein without repeated edits). */
function osa(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array<number>(b.length).fill(0),
  ]);
  for (let j = 0; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
      }
    }
  }
  return d[a.length]![b.length]!;
}

/** Rule 7: exact, prefix (query token length ≥ 3), or one edit (length ≥ 5). */
function tokenMatches(query: string, productToken: string): boolean {
  if (query === productToken) return true;
  if (query.length >= 3 && productToken.startsWith(query)) return true;
  return query.length >= 5 && osa(query, productToken) <= 1;
}

/** Rule 8: resolve memory tokens for one candidate category. */
function bindMemory(
  memory: readonly MemoryToken[],
  attrs: readonly string[],
): { bound: Map<string, Set<AttributeValue>>; ambiguous: boolean } {
  const bound = new Map<string, Set<AttributeValue>>();
  const unlabeled: MemoryToken[] = [];
  for (const m of memory) {
    if (m.label === "ram") addValue(bound, "ram_gb", m.gb);
    else if (m.label === "ssd") addValue(bound, "storage_gb", m.gb);
    else if (m.unit === "tb")
      addValue(bound, "storage_gb", m.gb); // TB can only mean storage
    else unlabeled.push(m);
  }
  if (!attrs.includes("ram_gb") && !attrs.includes("storage_gb")) {
    // A category with no memory attributes: bind to storage so it can never be satisfied.
    for (const m of unlabeled) addValue(bound, "storage_gb", m.gb);
    return { bound, ambiguous: false };
  }
  const free = ["ram_gb", "storage_gb"].filter((k) => attrs.includes(k) && !bound.has(k));
  if (unlabeled.length === 0) return { bound, ambiguous: false };
  if (unlabeled.length === 1 && free.length === 1) {
    addValue(bound, free[0]!, unlabeled[0]!.gb);
    return { bound, ambiguous: false };
  }
  if (unlabeled.length === 2 && free.length === 2) {
    const [smaller, larger] = [...unlabeled].sort((x, y) => x.gb - y.gb);
    addValue(bound, "ram_gb", smaller!.gb);
    addValue(bound, "storage_gb", larger!.gb);
    return { bound, ambiguous: false };
  }
  return { bound, ambiguous: true };
}

type VariantCheck = "match" | "mismatch" | "unknown";

const CLASS_ORDER: Record<MatchClass, number> = { match: 0, ambiguous: 1, near: 2 };

export function searchCatalog(
  products: readonly SearchProduct[],
  query: string,
  vocab: SearchVocabulary = BASE_VOCABULARY,
): SearchOutcome {
  if (!normalizeText(query)) return { status: "empty_query", results: [] };
  const parsed = parseQuery(query, vocab);
  if (parsed.text.length === 0 && parsed.categoryHint === null) {
    return { status: "query_too_broad", results: [] };
  }

  const rows: { result: SearchResult; coverage: number }[] = [];
  for (const product of products) {
    if (parsed.categoryHint && product.category !== parsed.categoryHint) continue;

    const productTokens = [
      ...new Set(tokensOf(`${product.brand} ${product.family} ${product.model}`)),
    ];
    const hit = new Set<string>();
    let allText = true;
    for (const token of parsed.text) {
      const matched = productTokens.filter((p) => tokenMatches(token, p));
      if (matched.length === 0) {
        allText = false;
        break;
      }
      matched.forEach((p) => hit.add(p));
    }
    if (!allText) continue;

    const attrs = vocab.categoryAttributes[product.category];
    const { bound, ambiguous } = bindMemory(parsed.memory, attrs);
    const wanted = new Map<string, Set<AttributeValue>>();
    for (const source of [parsed.values, bound]) {
      for (const [key, set] of source) for (const value of set) addValue(wanted, key, value);
    }
    const keys = [...wanted.keys()];
    const conflicts = keys.filter((k) => wanted.get(k)!.size > 1); // rule 9
    const coverage = productTokens.length === 0 ? 0 : hit.size / productTokens.length;

    if (ambiguous || conflicts.length > 0) {
      const reasons = [
        ...(ambiguous ? ["ambiguous_gb"] : []),
        ...conflicts.map((k) => `conflicting:${k}`),
      ].sort();
      rows.push({
        result: { productId: product.id, class: "ambiguous", variantIds: [], reasons },
        coverage,
      });
      continue;
    }

    const want = new Map(keys.map((k) => [k, [...wanted.get(k)!][0]!] as const));
    const check = (variant: SearchVariant, key: string): VariantCheck => {
      if (!attrs.includes(key)) return "mismatch";
      const value = variant.attributes[key];
      if (value === undefined) return "unknown";
      return value === want.get(key) ? "match" : "mismatch";
    };
    const exact = product.variants.filter((v) => keys.every((k) => check(v, k) === "match"));
    if (exact.length > 0) {
      rows.push({
        result: {
          productId: product.id,
          class: "match",
          variantIds: exact.map((v) => v.id),
          reasons: [],
        },
        coverage,
      });
      continue;
    }
    const reasons: string[] = [];
    for (const key of keys) {
      const per = product.variants.map((v) => check(v, key));
      if (per.includes("match")) continue;
      reasons.push(
        `${per.includes("unknown") ? "constraint_unknown" : "constraint_unavailable"}:${key}`,
      );
    }
    if (reasons.length === 0) reasons.push("combination_unavailable");
    rows.push({
      result: { productId: product.id, class: "near", variantIds: [], reasons: reasons.sort() },
      coverage,
    });
  }

  // Rule 13: class, then coverage (descending), then product id.
  rows.sort(
    (a, b) =>
      CLASS_ORDER[a.result.class] - CLASS_ORDER[b.result.class] ||
      b.coverage - a.coverage ||
      (a.result.productId < b.result.productId
        ? -1
        : a.result.productId > b.result.productId
          ? 1
          : 0),
  );
  return {
    status: rows.length > 0 ? "results" : "no_match",
    results: rows.map((r) => r.result),
  };
}
