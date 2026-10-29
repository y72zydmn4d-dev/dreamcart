import type { Vocabulary } from "@/modules/catalog";
import { t, type DictionaryKey } from "@/platform/i18n";

const LABELED = new Set([
  "screen_in",
  "chip",
  "ram_gb",
  "storage_gb",
  "color",
  "type",
  "brand",
  "family",
]);

/** Human label for an attribute group, for example "Bộ nhớ trong". Unknown keys are shown as written. */
export function attributeLabel(key: string): string {
  return LABELED.has(key) ? t(`attributes.${key}` as DictionaryKey) : key;
}

/**
 * Human label for an attribute value: numbers carry their unit (1024 GB → "1 TB"); coded values (chip, color,
 * type) use the catalog's Vietnamese vocabulary and fall back to the raw value, never to a guess.
 */
export function formatAttribute(
  key: string,
  value: string | number,
  vocabulary: Vocabulary = {},
): string {
  switch (key) {
    case "screen_in":
      return t("units.inch", { value });
    case "ram_gb":
      return t("units.gb", { value });
    case "storage_gb":
      return Number(value) >= 1024 && Number(value) % 1024 === 0
        ? t("units.tb", { value: Number(value) / 1024 })
        : t("units.gb", { value });
    default:
      return vocabulary[key]?.[String(value)]?.labelVi ?? String(value);
  }
}
