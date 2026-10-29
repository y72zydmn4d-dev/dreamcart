/**
 * Search-friendly text normalization: Unicode NFD, strip combining marks, `đ` → `d`, lowercase,
 * collapse whitespace (docs/SEARCH_FIXTURES.md rule 1). "Điện thoại" and "dien thoai" compare equal.
 */
export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalized alphanumeric tokens. */
export function tokenize(input: string): string[] {
  return normalizeText(input)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}
