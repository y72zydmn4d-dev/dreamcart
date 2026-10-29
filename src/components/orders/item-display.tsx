import { formatAttribute } from "@/components/product/attribute-format";
import { artKindFor } from "@/components/product/art-kind";
import { ProductArt } from "@/components/product/product-art";
import { configuratorGroups } from "@/components/product/groups";
import { PackageIcon } from "@/components/ui/icons";
import type { CatalogView } from "@/modules/discovery";
import type { OrderItemSnapshot } from "@/modules/orders";
import { renderableOrderImage } from "./order-lines";

/**
 * How an order item reads: the configuration in the catalog's own words ("13 inch · Chip FX1 · 16 GB") while the
 * product is still in the catalog, otherwise the stored raw values. An item the user entered by hand is shown as
 * they wrote it ("Màu: Đen"). The order itself never depends on this: it is only presentation.
 */
export function describeItem(item: OrderItemSnapshot, view: CatalogView): string {
  const entries = Object.entries(item.attributes);
  if (entries.length === 0) return "";
  const product = view.byId.get(item.productId);
  if (!product) return entries.map(([, value]) => String(value)).join(" · ");
  const order = configuratorGroups(product);
  const rank = (key: string) => {
    const i = order.indexOf(key);
    return i === -1 ? order.length : i;
  };
  return entries
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([key, value]) => formatAttribute(key, value, view.catalog.vocabulary))
    .join(" · ");
}

export function describeUserItem(item: OrderItemSnapshot): string {
  return Object.entries(item.attributes)
    .map(([name, value]) => `${name}: ${value}`)
    .join(" · ");
}

export const isUserItem = (item: OrderItemSnapshot) => item.productId.startsWith("user-");

export const itemDetails = (item: OrderItemSnapshot, view: CatalogView): string =>
  isUserItem(item) ? describeUserItem(item) : describeItem(item, view);

/**
 * The picture slot of an order item: the cleared photograph while rights still hold, otherwise the same original
 * placeholder illustration the storefront uses (for a product that is still in the catalog), otherwise a plain icon.
 */
export function ItemArt({
  item,
  view,
  iconSize,
}: {
  readonly item: OrderItemSnapshot;
  readonly view: CatalogView;
  readonly iconSize: number;
}) {
  const image = renderableOrderImage(item.imageRef, view.catalog.media);
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element -- self-hosted, rights re-checked above
    return <img src={image.src} alt={image.alt} className="size-full object-contain" />;
  }
  const product = isUserItem(item) ? undefined : view.byId.get(item.productId);
  if (product) {
    const colorValue = item.attributes.color;
    const swatch =
      typeof colorValue === "string"
        ? view.catalog.vocabulary.color?.[colorValue]?.swatch
        : undefined;
    return <ProductArt kind={artKindFor(product)} color={swatch} className="size-full" />;
  }
  return <PackageIcon size={iconSize} aria-hidden="true" />;
}
