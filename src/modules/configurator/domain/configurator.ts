/**
 * Hybrid Continuous Configurator rules (docs/CATALOG_SCHEMA.md, "Configurator derivation";
 * fixtures/configurator/cases.json). Options come only from real variants; an unavailable value is
 * reported with the groups it conflicts with; selecting it never changes other choices silently.
 */

export type AttributeValue = string | number;

export interface ConfigVariant {
  readonly id: string;
  readonly attributes: Readonly<Record<string, AttributeValue | undefined>>;
}

export type Selection = Readonly<Record<string, AttributeValue>>;

export type OptionState = "selected" | "available" | "unavailable";

export interface OptionView {
  readonly value: AttributeValue;
  readonly state: OptionState;
  /** For an unavailable value: the selected groups it cannot be combined with. */
  readonly conflicts: readonly string[];
}

export interface GroupView {
  readonly key: string;
  readonly options: readonly OptionView[];
}

export interface ConfiguratorView {
  readonly groups: readonly GroupView[];
  /** Set only when every group is chosen and exactly one variant matches. */
  readonly resolvedVariantId: string | null;
  /** Groups still to choose, in display order. */
  readonly missing: readonly string[];
  /** Variants consistent with the current selection (used for honest "from" prices). */
  readonly matchingVariantIds: readonly string[];
}

export type SelectResult =
  | { readonly status: "ok"; readonly selection: Selection }
  | {
      readonly status: "needs_reset";
      readonly conflicts: readonly string[];
      /** Unchanged: nothing is applied until the user confirms the reset. */
      readonly selection: Selection;
      /** What the selection becomes if the user confirms: the new value, conflicts cleared. */
      readonly selectionIfReset: Selection;
    };

const matches = (variant: ConfigVariant, constraints: Selection) =>
  Object.entries(constraints).every(([key, value]) => variant.attributes[key] === value);

const without = (selection: Selection, key: string): Selection =>
  Object.fromEntries(Object.entries(selection).filter(([k]) => k !== key));

/** Distinct values offered for a group: numbers ascending, strings in catalog order. */
export function groupValues(variants: readonly ConfigVariant[], key: string): AttributeValue[] {
  const seen: AttributeValue[] = [];
  for (const variant of variants) {
    const value = variant.attributes[key];
    if (value !== undefined && !seen.includes(value)) seen.push(value);
  }
  return seen.every((v) => typeof v === "number")
    ? [...seen].sort((a, b) => (a as number) - (b as number))
    : seen;
}

function conflictsFor(
  variants: readonly ConfigVariant[],
  selection: Selection,
  key: string,
  value: AttributeValue,
): string[] {
  const others = Object.keys(selection).filter((k) => k !== key);
  const pairwise = others.filter(
    (other) =>
      !variants.some(
        (v) => v.attributes[key] === value && v.attributes[other] === selection[other],
      ),
  );
  return (pairwise.length > 0 ? pairwise : others).sort();
}

export function deriveConfigurator(
  variants: readonly ConfigVariant[],
  groupOrder: readonly string[],
  selection: Selection,
): ConfiguratorView {
  const groups = groupOrder.map((key) => ({
    key,
    options: groupValues(variants, key).map((value): OptionView => {
      if (selection[key] === value) return { value, state: "selected", conflicts: [] };
      const possible = variants.some((v) =>
        matches(v, { ...without(selection, key), [key]: value }),
      );
      return possible
        ? { value, state: "available", conflicts: [] }
        : { value, state: "unavailable", conflicts: conflictsFor(variants, selection, key, value) };
    }),
  }));

  const missing = groupOrder.filter((key) => selection[key] === undefined);
  const matching = variants.filter((v) => matches(v, selection));
  return {
    groups,
    resolvedVariantId: missing.length === 0 && matching.length === 1 ? matching[0]!.id : null,
    missing,
    matchingVariantIds: matching.map((v) => v.id),
  };
}

export function selectOption(
  variants: readonly ConfigVariant[],
  selection: Selection,
  key: string,
  value: AttributeValue,
): SelectResult {
  const next = { ...without(selection, key), [key]: value };
  if (variants.some((v) => matches(v, next)))
    return { status: "ok", selection: { ...selection, [key]: value } };

  const conflicts = conflictsFor(variants, selection, key, value);
  const cleared = Object.fromEntries(
    Object.entries(selection).filter(([k]) => k !== key && !conflicts.includes(k)),
  );
  return {
    status: "needs_reset",
    conflicts,
    selection,
    selectionIfReset: { ...cleared, [key]: value },
  };
}

export function clearGroup(selection: Selection, key: string): Selection {
  return without(selection, key);
}
