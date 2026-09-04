import type { ShopItemDefinition, ShopType } from "../../content/master-data/shop-catalog";

export interface ShopAvailabilityPolicy {
    isEventShopAvailable(eventType: number, eventId: number, now: Date): boolean;
    isItemAvailable?(shopType: ShopType, item: ShopItemDefinition, now: Date): boolean;
}
