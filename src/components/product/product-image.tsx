import type { ProductView } from "@/modules/discovery";
import { cn } from "@/lib/utils";
import { ProductArt, type ArtView } from "./product-art";
import { artKindFor } from "./art-kind";

interface ProductImageProps {
  readonly product: ProductView;
  /** Body color for the placeholder art (from the catalog vocabulary swatch), if known. */
  readonly color?: string;
  readonly view?: ArtView;
  readonly label: string;
  readonly className?: string;
}

/**
 * The product's cleared photograph when there is one, otherwise the designed placeholder. An image whose rights
 * are not CLEARED never reaches this point (the catalog view filters it out), so it can never be shown by mistake.
 */
export function ProductImage({ product, color, view, label, className }: ProductImageProps) {
  const image = product.images[0];
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- self-hosted catalog file with known size; responsive sizes arrive with the first real images
      <img
        src={`/${image.file.replace(/^\//, "")}`}
        alt={image.altVi}
        width={image.width}
        height={image.height}
        loading="lazy"
        decoding="async"
        className={cn("block h-auto w-full object-contain", className)}
      />
    );
  }
  return (
    <ProductArt
      kind={artKindFor(product)}
      view={view}
      color={color}
      label={label}
      className={className}
    />
  );
}
