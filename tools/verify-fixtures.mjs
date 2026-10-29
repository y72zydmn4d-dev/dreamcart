#!/usr/bin/env node
// Spec-conformance reference for the Phase 0 fixtures. Zero dependencies.
//
// This is NOT production code. It exists so the written rules in
// docs/SEARCH_FIXTURES.md, docs/CATALOG_SCHEMA.md and docs/PRD.md can be checked
// mechanically. Phase 3 re-implements these rules as typed, tested domain modules
// and then deletes this file.
//
// Usage: node tools/verify-fixtures.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

// ---------------------------------------------------------------- search ----

const CATEGORY_ALIASES = {
  laptop: ["may tinh xach tay", "may tinh", "laptop", "notebook"],
  phone: ["dien thoai", "smartphone", "phone"],
  audio: ["tai nghe", "headphones", "headphone", "earbuds"],
};
const COLORS = { black: "black", white: "white", silver: "silver", graphite: "graphite", sand: "sand", den: "black", trang: "white", bac: "silver" };
const ATTRS = {
  laptop: ["screen_in", "chip", "ram_gb", "storage_gb"],
  phone: ["storage_gb", "color"],
  audio: ["color"],
};

function normalize(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d")
    .toLowerCase().replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
}

// Optimal-string-alignment distance (Damerau-Levenshtein without repeated edits).
function osa(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
const tokensOf = (s) => normalize(s).replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);

// Rule 2: memory tokens. A label before the number wins; a label after the number
// is consumed only when no label precedes it. Shorthand `128G` / `1T` (no space) counts
// as memory only for plausible memory sizes, so network generations (`5G`, `4G`) are not memory.
const SHORT_GB = new Set([8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 512]);
const SHORT_TB = new Set([1, 2, 4, 8]);
function extractMemory(q) {
  const re = /(?:\b(ram|ssd)\s+)?(\d+(?:\.\d+)?)(?:\s*(gb|tb)|(g|t))(?![a-z0-9])/g;
  const mem = [];
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(q))) {
    const n = Number(m[2]);
    const unit = (m[3] ?? m[4]).startsWith("t") ? "tb" : "gb";
    if (m[4] && !(unit === "tb" ? SHORT_TB : SHORT_GB).has(n)) continue; // not memory: stays a text token
    out += q.slice(last, m.index) + " ";
    last = re.lastIndex;
    let label = m[1] ?? null;
    if (!label) {
      const s = /^\s+(ram|ssd)\b/.exec(q.slice(last));
      if (s) { label = s[1]; last += s[0].length; re.lastIndex = last; }
    }
    mem.push({ gb: n * (unit === "tb" ? 1024 : 1), unit, label });
  }
  return { q: out + q.slice(last), mem };
}

function parseQuery(query) {
  let { q, mem } = extractMemory(normalize(query));
  const values = {}; // attribute -> Set of requested values (several values = conflict)
  const add = (k, v) => (values[k] ??= new Set()).add(v);
  q = q.replace(/(\d+(?:\.\d+)?)\s*(?:-\s*)?(?:inch(?:es)?|in|")(?![a-z0-9])/g, (_, n) => { add("screen_in", Number(n)); return " "; });
  let categoryHint = null;
  const flat = Object.entries(CATEGORY_ALIASES).flatMap(([c, al]) => al.map((a) => [c, a])).sort((x, y) => y[1].length - x[1].length);
  for (const [c, a] of flat) {
    const re = new RegExp(`(^| )${a}( |$)`);
    if (re.test(q)) { categoryHint = c; q = q.replace(re, " "); break; }
  }
  const text = [];
  for (const w of q.replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean)) {
    if (COLORS[w]) add("color", COLORS[w]);
    else if (/^fx\d$/.test(w)) add("chip", w);
    else text.push(w);
  }
  return { text, values, mem, categoryHint };
}

function tokenMatch(t, p) {
  if (t === p) return true;
  if (t.length >= 3 && p.startsWith(t)) return true;
  return t.length >= 5 && osa(t, p) <= 1;
}

// Rule 8: resolve memory tokens for one candidate category.
function bindMemory(mem, category) {
  const attrs = ATTRS[category];
  const bound = {};
  const add = (k, v) => (bound[k] ??= new Set()).add(v);
  const unlabeled = [];
  for (const m of mem) {
    if (m.label === "ram") add("ram_gb", m.gb);
    else if (m.label === "ssd") add("storage_gb", m.gb);
    else if (m.unit === "tb") add("storage_gb", m.gb); // TB can only mean storage
    else unlabeled.push(m);
  }
  if (!attrs.includes("ram_gb") && !attrs.includes("storage_gb")) {
    unlabeled.forEach((m) => add("storage_gb", m.gb)); // undefined for category: never satisfiable
    return { bound, ambiguous: false };
  }
  const free = ["ram_gb", "storage_gb"].filter((k) => attrs.includes(k) && !(k in bound));
  if (unlabeled.length === 0) return { bound, ambiguous: false };
  if (unlabeled.length === 1 && free.length === 1) { add(free[0], unlabeled[0].gb); return { bound, ambiguous: false }; }
  if (unlabeled.length === 2 && free.length === 2) {
    const [a, b] = [...unlabeled].sort((x, y) => x.gb - y.gb);
    add("ram_gb", a.gb); add("storage_gb", b.gb);
    return { bound, ambiguous: false };
  }
  return { bound, ambiguous: true };
}

function search(catalog, query) {
  const parsed = parseQuery(query);
  if (!normalize(query)) return { status: "empty_query", results: [] };
  if (!parsed.text.length && !parsed.categoryHint) return { status: "query_too_broad", results: [] };
  const rows = [];
  for (const p of catalog.products) {
    if (parsed.categoryHint && p.category !== parsed.categoryHint) continue;
    const ptoks = [...new Set(tokensOf(`${p.brand} ${p.family} ${p.model}`))];
    const hit = new Set();
    let ok = true;
    for (const t of parsed.text) {
      const m = ptoks.filter((x) => tokenMatch(t, x));
      if (!m.length) { ok = false; break; }
      m.forEach((x) => hit.add(x));
    }
    if (!ok) continue;

    const { bound, ambiguous } = bindMemory(parsed.mem, p.category);
    const sets = {};
    for (const src of [parsed.values, bound]) for (const [k, s] of Object.entries(src)) for (const v of s) (sets[k] ??= new Set()).add(v);
    const keys = Object.keys(sets);
    const conflicts = keys.filter((k) => sets[k].size > 1);
    const row = { productId: p.id, coverage: hit.size / ptoks.length };

    if (ambiguous || conflicts.length) {
      const reasons = [...(ambiguous ? ["ambiguous_gb"] : []), ...conflicts.map((k) => `conflicting:${k}`)].sort();
      Object.assign(row, { class: "ambiguous", variantIds: [], reasons });
    } else {
      const want = Object.fromEntries(keys.map((k) => [k, [...sets[k]][0]]));
      const st = (v, k) => (!ATTRS[p.category].includes(k) ? "mismatch" : v.attributes[k] === undefined ? "unknown" : v.attributes[k] === want[k] ? "match" : "mismatch");
      const exact = p.variants.filter((v) => keys.every((k) => st(v, k) === "match"));
      if (exact.length) Object.assign(row, { class: "match", variantIds: exact.map((v) => v.id) });
      else {
        const reasons = [];
        for (const k of keys) {
          const per = p.variants.map((v) => st(v, k));
          if (per.includes("match")) continue;
          reasons.push(`${per.includes("unknown") ? "constraint_unknown" : "constraint_unavailable"}:${k}`);
        }
        if (!reasons.length) reasons.push("combination_unavailable");
        Object.assign(row, { class: "near", variantIds: [], reasons: reasons.sort() });
      }
    }
    rows.push(row);
  }
  const order = { match: 0, ambiguous: 1, near: 2 };
  rows.sort((a, b) => order[a.class] - order[b.class] || b.coverage - a.coverage || (a.productId < b.productId ? -1 : 1));
  return { status: rows.length ? "results" : "no_match", results: rows.map(({ coverage, ...r }) => r) };
}

const canonSearch = (r) => JSON.stringify({ status: r.status, results: r.results.map((x) => ({ productId: x.productId, class: x.class, variantIds: x.variantIds ?? [], reasons: x.reasons ?? [] })) });

// ------------------------------------------------------- pricing / cart -----

const DAY_MS = 86_400_000;
const MAX_QTY = 99;

function validateMoneyRecord({ amountMinor, currency }) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 1) return "invalid";
  if (!/^[A-Z]{3}$/.test(currency)) return "invalid";
  return "valid";
}

// Derived price state and cart eligibility for one offer (CATALOG_SCHEMA.md).
function evaluateOffer({ now, config, offer }) {
  const p = offer.price;
  if (!p) return { state: "UNAVAILABLE", addable: false, reason: "no_price" };
  const ageDays = Math.max(0, (Date.parse(now) - Date.parse(p.observedAt)) / DAY_MS);
  let state;
  if (p.provenanceType === "user_entered") state = "USER_ENTERED";
  else {
    const warn = config.warnAfterDays[p.provenanceType];
    if (config.blockAfterDays !== null && ageDays > config.blockAfterDays) state = "EXPIRED";
    else state = ageDays <= warn ? "OBSERVED" : "STALE";
  }
  if (state === "EXPIRED") return { state, addable: false, reason: "expired" };
  if (p.currency !== "VND") return { state, addable: false, reason: "currency_not_supported" };
  if (state !== "USER_ENTERED" && offer.sourcePolicy !== "snapshot_allowed") {
    return { state, addable: false, reason: offer.sourcePolicy === "reference_only" ? "source_reference_only" : "source_policy_unknown" };
  }
  return { state, addable: true, reason: null };
}

function runCart({ ops, lines }) {
  const cart = new Map(); // key = variantId|offerId
  const meta = new Map();
  const src = ops ?? lines.map((l) => ({ ...l, add: true }));
  for (const o of src) {
    const key = `${o.variantId}|${o.offerId}`;
    if (!Number.isInteger(o.qty) || o.qty < 1) return { error: "invalid_quantity" };
    if (o.qty > MAX_QTY) return { error: "quantity_limit" };
    const next = (cart.get(key) ?? 0) + o.qty;
    if (next > MAX_QTY) return { error: "quantity_limit", lines: [...cart].map(([k, q]) => ({ key: k, qty: q })) };
    cart.set(key, next);
    meta.set(key, { amountMinor: o.amountMinor, currency: o.currency });
  }
  const subtotals = {};
  for (const [key, qty] of cart) {
    const { amountMinor, currency } = meta.get(key);
    subtotals[currency] = (subtotals[currency] ?? 0) + amountMinor * qty;
  }
  const currencies = Object.keys(subtotals);
  let checkout = "ok";
  if (cart.size === 0) checkout = "blocked:empty_cart";
  else if (currencies.length > 1) checkout = "blocked:mixed_currency";
  else if (currencies[0] !== "VND") checkout = "blocked:currency_not_supported";
  return { lines: [...cart].map(([k, q]) => ({ key: k, qty: q })), subtotals, checkout };
}

// ----------------------------------------------------------- configurator ---

const GROUPS = { laptop: ["screen_in", "chip", "ram_gb", "storage_gb"], phone: ["storage_gb", "color"], audio: ["color"] };

// Variants whose attributes equal every entry of `constraints` (a missing attribute never equals).
const variantsWith = (variants, constraints) => variants.filter((v) => Object.entries(constraints).every(([k, val]) => v.attributes[k] === val));
// Constraints for testing `value` in group `attr` against all OTHER current selections.
const without = (selection, attr) => Object.fromEntries(Object.entries(selection).filter(([k]) => k !== attr));

function configurator(product, selection) {
  const groups = GROUPS[product.category];
  const options = {};
  for (const g of groups) {
    const values = [...new Set(product.variants.map((v) => v.attributes[g]).filter((x) => x !== undefined))].sort((a, b) => (a > b ? 1 : -1));
    options[g] = {};
    for (const val of values) {
      const available = variantsWith(product.variants, { ...without(selection, g), [g]: val }).length > 0;
      options[g][String(val)] = selection[g] === val ? "selected" : available ? "available" : "unavailable";
    }
  }
  const missing = groups.filter((g) => selection[g] === undefined);
  const matches = missing.length ? [] : variantsWith(product.variants, selection);
  return { options, resolved: matches.length === 1 ? matches[0].id : null, missing };
}
function configuratorSelect(product, selection, { attr, value }) {
  if (variantsWith(product.variants, { ...without(selection, attr), [attr]: value }).length) return { status: "ok", selection: { ...selection, [attr]: value } };
  const others = Object.keys(selection).filter((h) => h !== attr);
  let conflicts = others.filter((h) => !product.variants.some((v) => v.attributes[attr] === value && v.attributes[h] === selection[h]));
  if (!conflicts.length) conflicts = others;
  return { status: "needs_reset", conflicts: conflicts.sort(), selection };
}

// ------------------------------------------------------------------ run -----

let failures = 0;
const report = (group, id, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failures++;
    console.log(`FAIL ${group} ${id}\n  expected ${JSON.stringify(want)}\n  got      ${JSON.stringify(got)}`);
    return false;
  }
  return true;
};
const tally = {};
const count = (group, ok) => { tally[group] ??= { pass: 0, total: 0 }; tally[group].total++; if (ok) tally[group].pass++; };

const catalog = load("fixtures/search/fixture-catalog.json");
const byId = Object.fromEntries(catalog.products.map((p) => [p.id, p]));

for (const f of load("fixtures/search/queries.json").fixtures) {
  count("search", report("search", f.id, canonSearch(search(catalog, f.query)), canonSearch(f.expected)));
}
const pricing = load("fixtures/pricing/cases.json");
for (const c of pricing.records) count("pricing.records", report("records", c.id, validateMoneyRecord(c.record), c.expected));
for (const c of pricing.offers) count("pricing.offers", report("offers", c.id, evaluateOffer(c), c.expected));
for (const c of pricing.carts) count("pricing.carts", report("carts", c.id, runCart(c), c.expected));
for (const c of load("fixtures/configurator/cases.json").cases) {
  const product = byId[c.product];
  const got = c.select ? configuratorSelect(product, c.selection, c.select) : configurator(product, c.selection);
  count("configurator", report("configurator", c.id, got, c.expected));
}

let total = 0, passed = 0;
for (const [g, t] of Object.entries(tally)) { console.log(`${g.padEnd(18)} ${t.pass}/${t.total}`); total += t.total; passed += t.pass; }
console.log(`TOTAL ${passed}/${total}`);
process.exit(failures ? 1 : 0);
