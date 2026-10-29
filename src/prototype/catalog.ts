/**
 * PHASE 2 PROTOTYPE DATA: SYNTHETIC, NOT A CATALOG.
 *
 * "Fixturia" is a fictional brand invented to evaluate the design. Products, specifications, and
 * prices are made up and must never be presented as real or verified. Every surface that shows
 * them carries the "Dữ liệu mẫu" label. Ids use the reserved `fx-` prefix, which the Phase 5
 * catalog validator rejects, so this file cannot leak into the real catalog.
 */

export type Category = "laptop" | "phone" | "audio";
export type ArtKind = "laptop" | "phone" | "earbuds" | "headphones";
export type AttributeKey = "screen_in" | "chip" | "ram_gb" | "storage_gb" | "color" | "type";

export interface PrototypeVariant {
  readonly id: string;
  readonly attributes: Readonly<Partial<Record<AttributeKey, string | number>>>;
  /** Sample price in VND (integer, exponent 0). Synthetic. */
  readonly samplePriceMinor: number;
}

export interface PrototypeProduct {
  readonly id: string;
  readonly brand: "Fixturia";
  readonly name: string;
  readonly category: Category;
  readonly art: ArtKind;
  readonly tagline: string;
  readonly summary: string;
  /** Configurator groups in display order. */
  readonly groups: readonly AttributeKey[];
  readonly variants: readonly PrototypeVariant[];
  readonly specs: readonly { readonly label: string; readonly value: string }[];
  readonly featured: boolean;
}

/** Swatch colors for the original placeholder art (not real product colors). */
export const COLOR_SWATCHES: Readonly<Record<string, string>> = {
  graphite: "#3f4148",
  sand: "#d9c7a7",
  black: "#26262b",
  white: "#f1f1f3",
  silver: "#c9cbd1",
  mint: "#a9dcc9",
  midnight: "#2c3550",
  lunar: "#b9bdd1",
};

export const CATEGORIES: readonly Category[] = ["laptop", "phone", "audio"];

export const PROTOTYPE_PRODUCTS: readonly PrototypeProduct[] = [
  {
    id: "fx-aero",
    brand: "Fixturia",
    name: "Fixturia Aero",
    category: "laptop",
    art: "laptop",
    tagline: "Mỏng nhẹ cho mọi ngày.",
    summary:
      "Laptop mẫu với hai kích thước màn hình và hai dòng chip hư cấu, dùng để thử bộ cấu hình phụ thuộc.",
    groups: ["screen_in", "chip", "ram_gb", "storage_gb"],
    variants: [
      {
        id: "fx-aero:13-fx1-8-256",
        attributes: { screen_in: 13, chip: "fx1", ram_gb: 8, storage_gb: 256 },
        samplePriceMinor: 24990000,
      },
      {
        id: "fx-aero:13-fx1-16-512",
        attributes: { screen_in: 13, chip: "fx1", ram_gb: 16, storage_gb: 512 },
        samplePriceMinor: 29990000,
      },
      {
        id: "fx-aero:13-fx2-16-512",
        attributes: { screen_in: 13, chip: "fx2", ram_gb: 16, storage_gb: 512 },
        samplePriceMinor: 33990000,
      },
      {
        id: "fx-aero:15-fx2-16-512",
        attributes: { screen_in: 15, chip: "fx2", ram_gb: 16, storage_gb: 512 },
        samplePriceMinor: 37990000,
      },
      {
        id: "fx-aero:15-fx2-32-1024",
        attributes: { screen_in: 15, chip: "fx2", ram_gb: 32, storage_gb: 1024 },
        samplePriceMinor: 47990000,
      },
    ],
    specs: [
      { label: "Màn hình", value: "13 hoặc 15 inch (mẫu)" },
      { label: "Chip", value: "FX1 hoặc FX2 (hư cấu)" },
      { label: "Pin", value: "Đến 18 giờ (mẫu)" },
      { label: "Trọng lượng", value: "Từ 1,2 kg (mẫu)" },
    ],
    featured: true,
  },
  {
    id: "fx-titan",
    brand: "Fixturia",
    name: "Fixturia Titan 16",
    category: "laptop",
    art: "laptop",
    tagline: "Hiệu năng cho công việc nặng.",
    summary: "Laptop mẫu cấu hình cao, chỉ có một lựa chọn chip và hai mức bộ nhớ.",
    groups: ["chip", "ram_gb", "storage_gb", "color"],
    variants: [
      {
        id: "fx-titan:fx2-32-1024-midnight",
        attributes: { chip: "fx2", ram_gb: 32, storage_gb: 1024, color: "midnight" },
        samplePriceMinor: 54990000,
      },
      {
        id: "fx-titan:fx2-64-2048-midnight",
        attributes: { chip: "fx2", ram_gb: 64, storage_gb: 2048, color: "midnight" },
        samplePriceMinor: 69990000,
      },
      {
        id: "fx-titan:fx2-32-1024-silver",
        attributes: { chip: "fx2", ram_gb: 32, storage_gb: 1024, color: "silver" },
        samplePriceMinor: 54990000,
      },
    ],
    specs: [
      { label: "Màn hình", value: "16 inch (mẫu)" },
      { label: "Chip", value: "FX2 (hư cấu)" },
      { label: "Cổng kết nối", value: "4 cổng (mẫu)" },
    ],
    featured: true,
  },
  {
    id: "fx-nova",
    brand: "Fixturia",
    name: "Fixturia Nova 5",
    category: "phone",
    art: "phone",
    tagline: "Màn hình lớn, máy ảnh kép.",
    summary:
      "Điện thoại mẫu: một số màu chỉ có ở một số dung lượng, để thử trạng thái tùy chọn không khả dụng.",
    groups: ["storage_gb", "color"],
    variants: [
      {
        id: "fx-nova:128-graphite",
        attributes: { storage_gb: 128, color: "graphite" },
        samplePriceMinor: 18990000,
      },
      {
        id: "fx-nova:256-graphite",
        attributes: { storage_gb: 256, color: "graphite" },
        samplePriceMinor: 21990000,
      },
      {
        id: "fx-nova:256-sand",
        attributes: { storage_gb: 256, color: "sand" },
        samplePriceMinor: 21990000,
      },
      {
        id: "fx-nova:512-graphite",
        attributes: { storage_gb: 512, color: "graphite" },
        samplePriceMinor: 26990000,
      },
    ],
    specs: [
      { label: "Màn hình", value: "6,4 inch (mẫu)" },
      { label: "Máy ảnh", value: "Kép (mẫu)" },
      { label: "Kết nối", value: "5G (mẫu)" },
    ],
    featured: true,
  },
  {
    id: "fx-nova-mini",
    brand: "Fixturia",
    name: "Fixturia Nova 5 Mini",
    category: "phone",
    art: "phone",
    tagline: "Gọn trong lòng bàn tay.",
    summary: "Điện thoại mẫu nhỏ gọn với một cấu hình duy nhất.",
    groups: ["storage_gb", "color"],
    variants: [
      {
        id: "fx-nova-mini:128-graphite",
        attributes: { storage_gb: 128, color: "graphite" },
        samplePriceMinor: 15990000,
      },
    ],
    specs: [
      { label: "Màn hình", value: "5,4 inch (mẫu)" },
      { label: "Máy ảnh", value: "Đơn (mẫu)" },
    ],
    featured: false,
  },
  {
    id: "fx-pulse",
    brand: "Fixturia",
    name: "Fixturia Pulse 3",
    category: "phone",
    art: "phone",
    tagline: "Nhiều màu, đủ dung lượng.",
    summary: "Điện thoại mẫu có đủ mọi tổ hợp dung lượng và màu.",
    groups: ["storage_gb", "color"],
    variants: [
      {
        id: "fx-pulse:128-black",
        attributes: { storage_gb: 128, color: "black" },
        samplePriceMinor: 9990000,
      },
      {
        id: "fx-pulse:128-white",
        attributes: { storage_gb: 128, color: "white" },
        samplePriceMinor: 9990000,
      },
      {
        id: "fx-pulse:128-mint",
        attributes: { storage_gb: 128, color: "mint" },
        samplePriceMinor: 9990000,
      },
      {
        id: "fx-pulse:256-black",
        attributes: { storage_gb: 256, color: "black" },
        samplePriceMinor: 11990000,
      },
      {
        id: "fx-pulse:256-white",
        attributes: { storage_gb: 256, color: "white" },
        samplePriceMinor: 11990000,
      },
      {
        id: "fx-pulse:256-mint",
        attributes: { storage_gb: 256, color: "mint" },
        samplePriceMinor: 11990000,
      },
    ],
    specs: [
      { label: "Màn hình", value: "6,1 inch (mẫu)" },
      { label: "Pin", value: "2 ngày (mẫu)" },
    ],
    featured: false,
  },
  {
    id: "fx-buds-pro",
    brand: "Fixturia",
    name: "Fixturia Buds Pro 2",
    category: "audio",
    art: "earbuds",
    tagline: "Chống ồn, gọn nhẹ.",
    summary: "Tai nghe nhét tai mẫu với hai màu.",
    groups: ["color"],
    variants: [
      {
        id: "fx-buds-pro:black",
        attributes: { type: "earbuds", color: "black" },
        samplePriceMinor: 5490000,
      },
      {
        id: "fx-buds-pro:white",
        attributes: { type: "earbuds", color: "white" },
        samplePriceMinor: 5490000,
      },
    ],
    specs: [
      { label: "Kiểu", value: "Nhét tai (mẫu)" },
      { label: "Chống ồn", value: "Có (mẫu)" },
    ],
    featured: true,
  },
  {
    id: "fx-buds-lite",
    brand: "Fixturia",
    name: "Fixturia Buds Lite",
    category: "audio",
    art: "earbuds",
    tagline: "Âm thanh hằng ngày.",
    summary: "Tai nghe nhét tai mẫu, một màu.",
    groups: ["color"],
    variants: [
      {
        id: "fx-buds-lite:black",
        attributes: { type: "earbuds", color: "black" },
        samplePriceMinor: 1990000,
      },
    ],
    specs: [{ label: "Kiểu", value: "Nhét tai (mẫu)" }],
    featured: false,
  },
  {
    id: "fx-studio",
    brand: "Fixturia",
    name: "Fixturia Studio 700",
    category: "audio",
    art: "headphones",
    tagline: "Không gian âm thanh rộng.",
    summary: "Tai nghe chụp tai mẫu với hai màu.",
    groups: ["color"],
    variants: [
      {
        id: "fx-studio:black",
        attributes: { type: "over_ear", color: "black" },
        samplePriceMinor: 8990000,
      },
      {
        id: "fx-studio:silver",
        attributes: { type: "over_ear", color: "silver" },
        samplePriceMinor: 8990000,
      },
    ],
    specs: [
      { label: "Kiểu", value: "Chụp tai (mẫu)" },
      { label: "Thời lượng pin", value: "30 giờ (mẫu)" },
    ],
    featured: false,
  },
];

export function findPrototypeProduct(id: string): PrototypeProduct | undefined {
  return PROTOTYPE_PRODUCTS.find((p) => p.id === id);
}
