import {
  type Category,
  type MediaAsset,
  type Offer,
  type Product,
  type Source,
  type ValidatedCatalog,
  type Variant,
  rendersAsProductImage,
} from "@/modules/catalog";
import {
  DEFAULT_FRESHNESS,
  evaluateOffer,
  type FreshnessConfig,
  type OfferEvaluation,
  type PriceState,
  type ProvenanceType,
} from "@/modules/pricing";

/**
 * Read model over a validated catalog: products with their variants, the offers on each variant and the price
 * state of every offer at a given time. A price is shown only when an offer actually carries one; there is no
 * "family price", no estimate and no conversion. Everything is derived, nothing is stored.
 */

export interface OfferView {
  readonly offer: Offer;
  readonly source: Source;
  readonly evaluation: OfferEvaluation;
}

export interface ReferencePrice {
  readonly amountMinor: number;
  readonly offerId: string;
  readonly variantId: string;
  readonly state: PriceState;
  readonly observedAt: string;
  readonly provenanceType: ProvenanceType;
  readonly sourceName: string;
}

export interface VariantView {
  readonly variant: Variant;
  /** Offers with a viewable VND price first (cheapest first), then offers without a price. */
  readonly offers: readonly OfferView[];
  /** The cheapest viewable VND offer, or null when no offer on this variant carries a price. */
  readonly best: ReferencePrice | null;
  /** `priced`: at least one viewable VND price. `unpriced`: a verified configuration with no price yet. */
  readonly status: "priced" | "unpriced";
}

export interface ProductView {
  readonly product: Product;
  readonly variants: readonly VariantView[];
  /** Lowest reference price over this product's variants, or null. Always labeled "from", never "the price". */
  readonly startingPrice: ReferencePrice | null;
  readonly pricedVariantCount: number;
  /** Only images whose rights are CLEARED. Everything else renders the designed placeholder. */
  readonly images: readonly MediaAsset[];
}

export interface CatalogView {
  readonly catalog: ValidatedCatalog;
  readonly nowMs: number;
  readonly products: readonly ProductView[];
  readonly byId: ReadonlyMap<string, ProductView>;
  readonly categories: readonly Category[];
}

const byAmount = (a: ReferencePrice, b: ReferencePrice) =>
  a.amountMinor - b.amountMinor || (a.offerId < b.offerId ? -1 : 1);

function referencePrice(view: OfferView): ReferencePrice | null {
  const price = view.offer.price;
  if (!price || price.currency !== "VND") return null;
  return {
    amountMinor: price.amountMinor,
    offerId: view.offer.id,
    variantId: view.offer.variantId,
    state: view.evaluation.state,
    observedAt: price.observedAt,
    provenanceType: price.provenanceType,
    sourceName: view.source.name,
  };
}

export function buildCatalogView(
  catalog: ValidatedCatalog,
  nowMs: number,
  freshness: FreshnessConfig = DEFAULT_FRESHNESS,
): CatalogView {
  const sources = new Map(catalog.sources.map((s) => [s.id, s]));
  const offersByVariant = new Map<string, OfferView[]>();
  for (const offer of catalog.offers) {
    const source = sources.get(offer.sourceId)!;
    const evaluation = evaluateOffer(
      { sourcePolicy: source.persistencePolicy, price: offer.price },
      nowMs,
      freshness,
    );
    const list = offersByVariant.get(offer.variantId) ?? [];
    list.push({ offer, source, evaluation });
    offersByVariant.set(offer.variantId, list);
  }
  const variantsByProduct = new Map<string, Variant[]>();
  for (const variant of catalog.variants) {
    const list = variantsByProduct.get(variant.productId) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.productId, list);
  }
  const imagesFor = (product: Product) =>
    catalog.media
      .filter(
        (m) =>
          rendersAsProductImage(m) &&
          (m.productId === product.id ||
            catalog.variants.some((v) => v.id === m.variantId && v.productId === product.id)),
      )
      .sort((a, b) => (a.id < b.id ? -1 : 1));

  const products: ProductView[] = catalog.products.map((product) => {
    const variants: VariantView[] = (variantsByProduct.get(product.id) ?? []).map((variant) => {
      const offers = [...(offersByVariant.get(variant.id) ?? [])].sort((a, b) => {
        const pa = referencePrice(a);
        const pb = referencePrice(b);
        if (pa && pb) return byAmount(pa, pb);
        return pa ? -1 : pb ? 1 : a.offer.id < b.offer.id ? -1 : 1;
      });
      const best = offers.map(referencePrice).find((p): p is ReferencePrice => p !== null) ?? null;
      return { variant, offers, best, status: best ? ("priced" as const) : ("unpriced" as const) };
    });
    const prices = variants.flatMap((v) => (v.best ? [v.best] : [])).sort(byAmount);
    return {
      product,
      variants,
      startingPrice: prices[0] ?? null,
      pricedVariantCount: variants.filter((v) => v.status === "priced").length,
      images: imagesFor(product),
    };
  });
  return {
    catalog,
    nowMs,
    products,
    byId: new Map(products.map((p) => [p.product.id, p])),
    categories: [...new Set(products.map((p) => p.product.category))].sort(),
  };
}
