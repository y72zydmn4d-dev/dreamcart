import type { ProductView } from "@/modules/discovery";

export type ArtKind = "laptop" | "phone" | "earbuds" | "headphones";

/** Which placeholder silhouette suits a product, from its category and (for audio) its type attribute. */
export function artKindFor(product: ProductView): ArtKind {
  switch (product.product.category) {
    case "laptop":
      return "laptop";
    case "phone":
      return "phone";
    case "audio": {
      const types = new Set(product.variants.map((v) => v.variant.attributes.type));
      return types.has("over_ear") || types.has("on_ear") ? "headphones" : "earbuds";
    }
  }
}
