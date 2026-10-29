import type { AttributeKey } from "@/prototype/catalog";
import { t, type DictionaryKey } from "@/platform/i18n";

/** Human label for an attribute group, for example "Bộ nhớ trong". */
export function attributeLabel(key: AttributeKey): string {
  return t(`attributes.${key}`);
}

/** Human label for an attribute value, for example 1024 → "1 TB", "graphite" → "Xám than". */
export function formatAttribute(key: AttributeKey, value: string | number): string {
  switch (key) {
    case "screen_in":
      return t("units.inch", { value });
    case "ram_gb":
      return t("units.gb", { value });
    case "storage_gb":
      return Number(value) >= 1024 && Number(value) % 1024 === 0
        ? t("units.tb", { value: Number(value) / 1024 })
        : t("units.gb", { value });
    case "chip":
      return String(value).toUpperCase();
    case "color":
      return t(`colors.${value}` as DictionaryKey);
    case "type":
      return t(`audioTypes.${value}` as DictionaryKey);
  }
}
