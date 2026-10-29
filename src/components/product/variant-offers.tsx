import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import type { VariantView } from "@/modules/discovery";
import { t, type DictionaryKey } from "@/platform/i18n";
import { OutboundLink } from "./outbound-link";
import { PriceNote } from "./price-note";

/**
 * The merchants on record for ONE resolved variant, cheapest first. Each row keeps its own currency (no
 * conversion), says where the price came from and when it was seen, and says plainly whether the offer could be
 * added to the simulated cart. An offer from another variant can never appear here.
 */
export function VariantOffers({
  variant,
  synthetic,
  title,
}: {
  readonly variant: VariantView | null;
  readonly synthetic: boolean;
  /** The product's name, used in the cart acknowledgement. */
  readonly title: string;
}) {
  return (
    <section aria-labelledby="offers-heading" className="flex flex-col gap-3">
      <h2 id="offers-heading" className="text-title font-semibold">
        {t("product.offersHeading")}
      </h2>
      {!variant ? (
        <p className="rounded-xl border border-dashed border-border-strong bg-surface p-4 text-muted-foreground">
          {t("product.offersPick")}
        </p>
      ) : variant.offers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong bg-surface p-4 text-muted-foreground">
          {t("product.offersEmpty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {variant.offers.map(({ offer, source, evaluation }) => (
            <li
              key={offer.id}
              className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-medium">{offer.merchantName}</p>
                {offer.price ? (
                  <p className="text-lg font-semibold">
                    {formatMoney(offer.price.amountMinor, offer.price.currency)}
                  </p>
                ) : (
                  <p className="font-semibold text-muted-foreground">{t("search.noPrice")}</p>
                )}
              </div>
              {offer.price ? (
                <>
                  <PriceNote
                    observedAt={offer.price.observedAt}
                    state={evaluation.state}
                    synthetic={synthetic}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t(`price.provenance.${offer.price.provenanceType}` as DictionaryKey)} ·{" "}
                    {t("price.source", { name: source.name })}
                  </p>
                  {offer.price.currency !== "VND" ? (
                    <p className="text-xs text-muted-foreground">{t("price.notConverted")}</p>
                  ) : null}
                </>
              ) : null}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col items-start gap-2">
                  {evaluation.addable ? (
                    <Badge tone="success">{t("price.addable")}</Badge>
                  ) : (
                    <Badge tone="warning">
                      {t(`price.cartBlock.${evaluation.reason ?? "no_price"}` as DictionaryKey)}
                    </Badge>
                  )}
                  <OutboundLink url={offer.url} label={t("product.viewSource")} />
                </div>
                {evaluation.addable && offer.price ? (
                  <AddToCartButton
                    variantId={variant.variant.id}
                    offerId={offer.id}
                    unitPrice={{
                      amountMinor: offer.price.amountMinor,
                      currency: offer.price.currency,
                    }}
                    evaluation={evaluation}
                    title={title}
                    merchant={offer.merchantName}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
