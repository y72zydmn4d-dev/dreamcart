import type { OrderState } from "@/modules/orders";
import { t } from "@/platform/i18n";

/** Every state is worded as simulated: "ảo", "mô phỏng". Nothing claims a real shipment. */
export function stateLabel(state: OrderState): string {
  switch (state) {
    case "CONFIRMED":
      return t("orderStates.confirmed");
    case "PREPARING":
      return t("orderStates.preparing");
    case "PACKED":
      return t("orderStates.packed");
    case "IN_TRANSIT":
      return t("orderStates.inTransit");
    case "OUT_FOR_VIRTUAL_DELIVERY":
      return t("orderStates.outForDelivery");
    case "VIRTUALLY_DELIVERED":
      return t("orderStates.delivered");
    case "CANCELLED":
      return t("orderStates.cancelled");
  }
}
