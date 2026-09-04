import type { GachaDefinition } from "../../content/master-data/gacha-catalog";
import type { ScheduleService } from "../../live/schedule/schedule.service";
import type { SeasonalWindowResolver } from "../../live/schedule/seasonal-window-resolver";
import { InvalidRequestError } from "../../shared/errors/application-error";

export interface GachaAvailabilityPolicy {
    isAvailable(gacha: GachaDefinition, now: Date): boolean;
    assertAvailable(gacha: GachaDefinition, now: Date): void;
}

/** Manual schedule entries override master dates. Without a binding, legacy master
 * start/end dates are mapped onto the accelerated season automatically. */
export class SeasonalGachaAvailabilityPolicy implements GachaAvailabilityPolicy {
    constructor(
        private readonly windows: SeasonalWindowResolver,
        private readonly schedule?: ScheduleService,
    ) {}

    isAvailable(gacha: GachaDefinition, now: Date): boolean {
        const bindings = this.schedule?.getForContent("gacha", String(gacha.id)) ?? [];
        if (bindings.length > 0) {
            return bindings.some((entry) => this.schedule?.isActive(entry.id, now) ?? false);
        }
        return this.windows.isActive(gacha.startDate, gacha.endDate, now);
    }

    assertAvailable(gacha: GachaDefinition, now: Date): void {
        if (!this.isAvailable(gacha, now)) throw new InvalidRequestError("Gacha is not active.");
    }
}
