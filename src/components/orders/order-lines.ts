import type { MediaAsset, UserProduct } from "@/modules/catalog";
import type { CatalogView } from "@/modules/discovery";
import type { ImageRef, ResolvedLine } from "@/modules/orders";

/** Shown as the brand of an item the user entered by hand: there is no verified brand to claim. */
export const USER_ITEM_BRAND = "Tự nhập";
export const USER_ITEM_MERCHANT = "Do bạn nhập";

/**
 * Catalog data for one cart line at placement time: the offer as the catalog describes it right now, or the
 * imported item the user entered. Returns `null` for anything unknown (the order is then refused, never guessed).
 */
export function orderLineResolver(
  view: CatalogView,
  userProducts: readonly UserProduct[],
): (variantId: string, offerId: string) => ResolvedLine | null {
  const variants = new Map(
    view.products.flatMap((p) => p.variants.map((v) => [v.variant.id, { product: p, variant: v }])),
  );
  const users = new Map(userProducts.map((u) => [u.id, u]));
  return (variantId, offerId) => {
    const user = users.get(variantId);
    if (user) {
      if (offerId !== `${user.id}@user`) return null;
      return {
        productId: user.id,
        brand: USER_ITEM_BRAND,
        titleVi: user.title,
        attributes: { ...user.attributes },
        merchantName: USER_ITEM_MERCHANT,
        sourceUrl: user.sourceUrl,
        price: user.price
          ? {
              amountMinor: user.price.amountMinor,
              currency: user.price.currency,
              observedAt: new Date(user.createdAtMs).toISOString(),
              provenanceType: "user_entered",
            }
          : null,
        sourcePolicy: "unknown",
        imageRef: null,
      };
    }
    const found = variants.get(variantId);
    const offerView = found?.variant.offers.find((o) => o.offer.id === offerId);
    if (!found || !offerView) return null;
    const image = found.product.images[0];
    return {
      productId: found.product.product.id,
      brand: found.product.product.brand,
      titleVi: found.product.product.titleVi,
      attributes: { ...found.variant.variant.attributes },
      merchantName: offerView.offer.merchantName,
      sourceUrl: offerView.offer.url,
      price: offerView.offer.price,
      sourcePolicy: offerView.source.persistencePolicy,
      imageRef: image
        ? {
            mediaId: image.id,
            file: image.file,
            rightsStatus: "CLEARED",
            ...(image.rights.attributionText
              ? { attributionText: image.rights.attributionText }
              : {}),
          }
        : null,
    };
  };
}

export interface RenderableImage {
  readonly src: string;
  readonly alt: string;
  readonly credit: string | null;
}

/**
 * An order keeps the image reference it was placed with, but rights can change afterwards. The image is shown only
 * if the catalog still holds that exact file as CLEARED; otherwise the order falls back to the placeholder.
 */
export function renderableOrderImage(
  ref: ImageRef | null,
  media: readonly MediaAsset[],
): RenderableImage | null {
  if (!ref || ref.rightsStatus !== "CLEARED") return null;
  const asset = media.find((m) => m.id === ref.mediaId && m.file === ref.file);
  if (!asset || asset.rights.status !== "CLEARED") return null;
  return {
    src: `/${asset.file.replace(/^\//, "")}`,
    alt: asset.altVi,
    credit: asset.rights.attributionText ?? null,
  };
}
