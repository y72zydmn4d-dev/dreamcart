export type ArtTone = "dark" | "light" | "mid";

/** WCAG relative luminance of a #rgb / #rrggbb color, or null when the text is not a hex color. */
export function relativeLuminance(hex: string): number | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const digits = match[1]!;
  const full = digits.length === 3 ? [...digits].map((c) => c + c).join("") : digits;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(full.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Whether a body color is dark or light enough to merge with the art stage (a dark purple in dark mode, a pale
 * grey in light mode). Only used to choose a neutral backlight and rim; the product's own color is never changed.
 */
export function artTone(color: string): ArtTone {
  const luminance = relativeLuminance(color);
  if (luminance === null) return "mid";
  if (luminance < 0.06) return "dark";
  if (luminance > 0.7) return "light";
  return "mid";
}
