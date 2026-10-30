import type { Vocabulary } from "@/modules/catalog";
import { t, type DictionaryKey } from "@/platform/i18n";

const LABELED = new Set([
  "screen_in",
  "chip",
  "ram_gb",
  "storage_gb",
  "cpu_cores",
  "gpu_cores",
  "resolution",
  "glass",
  "stand",
  "connectivity",
  "case_mm",
  "case_material",
  "band_type",
  "band_size",
  "band_color",
  "noise_control",
  "connector",
  "device_type",
  "accessory_type",
  "size",
  "material",
  "length_cm",
  "power_w",
  "package_qty",
  "fits_case_mm",
  "compatibility",
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
    case "cpu_cores":
    case "gpu_cores":
      return t("units.cores", { value });
    case "case_mm":
    case "fits_case_mm":
      return t("units.mm", { value });
    case "length_cm":
      return t("units.cm", { value });
    case "power_w":
      return t("units.watt", { value });
    case "package_qty":
      return t("units.pieces", { value });
    case "storage_gb":
      return Number(value) >= 1024 && Number(value) % 1024 === 0
        ? t("units.tb", { value: Number(value) / 1024 })
        : t("units.gb", { value });
    default:
      return vocabulary[key]?.[String(value)]?.labelVi ?? String(value);
  }
}
