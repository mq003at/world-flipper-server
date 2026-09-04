import type { ShopItemDefinition, ShopType } from "../../content/master-data/shop-catalog";
import type { ScheduleService } from "../../live/schedule/schedule.service";
import type { SeasonalWindowResolver } from "../../live/schedule/seasonal-window-resolver";
import type { EventRegistry } from "../events/event-registry/event.registry";
import type { ShopAvailabilityPolicy } from "./shop-availability.policy";

export class SeasonalShopAvailabilityPolicy implements ShopAvailabilityPolicy {
    constructor(
        private readonly events: EventRegistry,
        private readonly windows: SeasonalWindowResolver,
        private readonly schedule?: ScheduleService,
    ) {}

    isEventShopAvailable(eventType: number, eventId: number, now: Date): boolean {
        return this.events.isEventShopAvailable(eventType, eventId, now);
    }

    isItemAvailable(shopType: ShopType, item: ShopItemDefinition, now: Date): boolean {
        const contentId = `${shopType}:${item.id}`;
        const bindings = this.schedule?.getForContent("shop", contentId) ?? [];
        if (bindings.length > 0) {
            return bindings.some((entry) => this.schedule?.isActive(entry.id, now) ?? false);
        }
        return this.windows.isActive(item.availableFrom, item.availableUntil, now);
    }
}
