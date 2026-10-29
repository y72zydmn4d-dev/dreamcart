import { formatAttribute } from "@/components/product/attribute-format";
import { configuratorGroups } from "@/components/product/groups";
import type { CartLine, CurrentOffer } from "@/modules/cart";
import { userOfferId, type UserProduct, type Vocabulary } from "@/modules/catalog";
import type { CatalogView, OfferView, ProductView, VariantView } from "@/modules/discovery";
import { evaluateOffer, type PriceState } from "@/modules/pricing";
import { t } from "@/platform/i18n";

export type LineOrigin = "catalog" | "user" | "unknown";

/** Everything the cart needs to show one line honestly, derived from the catalog and the imported items. */
export interface ResolvedLine {
  readonly line: CartLine;
  readonly origin: LineOrigin;
  readonly title: string;
  readonly details: string;
  readonly merchant: string;
  /** The page of the product in DreamCart, for catalog lines. */
  readonly productId: string | null;
  readonly sourceUrl: string | null;
  /** The offer as it stands now; `null` when it is no longer known. */
  readonly current: CurrentOffer | null;
  /** When the current price was observed, and how fresh it is (catalog offers only). */
  readonly observedAt: string | null;
  readonly priceState: PriceState | null;
}

export interface LineIndex {
  readonly variants: ReadonlyMap<string, { product: ProductView; variant: VariantView }>;
  readonly userProducts: ReadonlyMap<string, UserProduct>;
  readonly nowMs: number;
  readonly vocabulary: Vocabulary;
}

export function buildLineIndex(
  view: CatalogView,
  userProducts: readonly UserProduct[],
  nowMs: number,
): LineIndex {
  const variants = new Map<string, { product: ProductView; variant: VariantView }>();
  for (const product of view.products) {
    for (const variant of product.variants) variants.set(variant.variant.id, { product, variant });
  }
  return {
    variants,
    userProducts: new Map(userProducts.map((p) => [p.id, p])),
    nowMs,
    vocabulary: view.catalog.vocabulary,
  };
}

const priceOf = (o: OfferView["offer"]) =>
  o.price ? { amountMinor: o.price.amountMinor, currency: o.price.currency } : null;

/**
 * Cart eligibility of an imported item. A user-entered price does not age, so the evaluation does not depend on
 * the clock; the item is addable exactly when it has a price in the checkout currency.
 */
export function evaluateUserProduct(user: UserProduct) {
  return evaluateOffer(
    {
      sourcePolicy: "unknown",
      price: user.price
        ? {
            amountMinor: user.price.amountMinor,
            currency: user.price.currency,
            observedAt: new Date(user.createdAtMs).toISOString(),
            provenanceType: "user_entered",
          }
        : null,
    },
    user.createdAtMs,
  );
}

export function resolveLine(line: CartLine, index: LineIndex): ResolvedLine {
  const user = index.userProducts.get(line.variantId);
  if (user) {
    const matchesOffer = line.offerId === userOfferId(user.id);
    return {
      line,
      origin: "user",
      title: user.title,
      details: Object.entries(user.attributes)
        .map(([name, value]) => `${name}: ${value}`)
        .join(" · "),
      merchant: t("cart.line.userMerchant"),
      productId: null,
      sourceUrl: user.sourceUrl,
      current: matchesOffer
        ? {
            price: user.price ? { ...user.price } : null,
            evaluation: evaluateUserProduct(user),
          }
        : null,
      observedAt: null,
      priceState: "USER_ENTERED",
    };
  }

  const found = index.variants.get(line.variantId);
  const offerView = found?.variant.offers.find((o) => o.offer.id === line.offerId);
  if (!found || !offerView) {
    return {
      line,
      origin: "unknown",
      title: found?.product.product.titleVi ?? line.variantId,
      details: "",
      merchant: "",
      productId: found?.product.product.id ?? null,
      sourceUrl: null,
      current: null,
      observedAt: null,
      priceState: null,
    };
  }
  const groups = configuratorGroups(found.product);
  return {
    line,
    origin: "catalog",
    title: found.product.product.titleVi,
    details: groups
      .flatMap((key) => {
        const value = found.variant.variant.attributes[key];
        return value === undefined ? [] : [formatAttribute(key, value, index.vocabulary)];
      })
      .join(" · "),
    merchant: offerView.source.name,
    productId: found.product.product.id,
    sourceUrl: offerView.offer.url,
    current: { price: priceOf(offerView.offer), evaluation: offerView.evaluation },
    observedAt: offerView.offer.price?.observedAt ?? null,
    priceState: offerView.evaluation.state,
  };
}
