import type { ProductView } from "@/modules/discovery";

export type ArtKind =
  | "laptop"
  | "desktop"
  | "display"
  | "tablet"
  | "phone"
  | "watch"
  | "earbuds"
  | "headphones"
  | "tracker"
  | "accessory";

/** Which placeholder silhouette suits a product, from its category and (for audio) its type attribute. */
export function artKindFor(product: ProductView): ArtKind {
  switch (product.product.category) {
    case "laptop":
      return "laptop";
    case "desktop":
      return "desktop";
    case "display":
      return "display";
    case "tablet":
      return "tablet";
    case "phone":
      return "phone";
    case "wearable":
      return "watch";
    case "smart_home":
      return "tracker";
    case "accessory":
      return "accessory";
    case "audio": {
      const types = new Set(product.variants.map((v) => v.variant.attributes.type));
      return types.has("over_ear") || types.has("on_ear") ? "headphones" : "earbuds";
    }
  }
}
