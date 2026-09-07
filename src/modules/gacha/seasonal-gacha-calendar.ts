import type { GachaRotationConfig } from "./gacha-rotation.config";
import type { SeasonPosition } from "./seasonal-gacha.models";

const DAY_MS = 86_400_000;

function localParts(date: Date, offsetMinutes: number): Date {
    return new Date(date.getTime() + offsetMinutes * 60_000);
}

function utcFromLocal(year: number, month: number, day: number, offsetMinutes: number): Date {
    return new Date(Date.UTC(year, month, day) - offsetMinutes * 60_000);
}

export class SeasonalGachaCalendar {
    private readonly anchorLocal: Date;

    constructor(private readonly config: GachaRotationConfig) {
        this.anchorLocal = localParts(new Date(config.epoch), config.timezoneOffsetMinutes);
    }

    position(now: Date): SeasonPosition {
        const local = localParts(now, this.config.timezoneOffsetMinutes);
        const anchorMonth = this.anchorLocal.getUTCFullYear() * 12 + this.anchorLocal.getUTCMonth();
        const currentMonth = local.getUTCFullYear() * 12 + local.getUTCMonth();
        let seasonNumber = Math.floor((currentMonth - anchorMonth) / this.config.seasonMonths) + 1;
        let startMonth = anchorMonth + (seasonNumber - 1) * this.config.seasonMonths;
        let seasonStart = utcFromLocal(
            Math.floor(startMonth / 12),
            ((startMonth % 12) + 12) % 12,
            1,
            this.config.timezoneOffsetMinutes,
        );
        if (now < seasonStart) {
            seasonNumber -= 1;
            startMonth -= this.config.seasonMonths;
            seasonStart = utcFromLocal(
                Math.floor(startMonth / 12),
                ((startMonth % 12) + 12) % 12,
                1,
                this.config.timezoneOffsetMinutes,
            );
        }
        const endMonth = startMonth + this.config.seasonMonths;
        const seasonEndExclusive = utcFromLocal(
            Math.floor(endMonth / 12),
            ((endMonth % 12) + 12) % 12,
            1,
            this.config.timezoneOffsetMinutes,
        );
        const cycleIndex = Math.floor((now.getTime() - seasonStart.getTime()) / (this.config.cycleDays * DAY_MS));
        const cycleStart = new Date(seasonStart.getTime() + cycleIndex * this.config.cycleDays * DAY_MS);
        const cycleEndExclusive = new Date(
            Math.min(cycleStart.getTime() + this.config.cycleDays * DAY_MS, seasonEndExclusive.getTime()),
        );
        return { seasonNumber, seasonStart, seasonEndExclusive, cycleIndex, cycleStart, cycleEndExclusive };
    }

    isMonthEndCampaign(now: Date): boolean {
        const local = localParts(now, this.config.timezoneOffsetMinutes);
        const lastDay = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate();
        return local.getUTCDate() >= lastDay - 2;
    }

    dayKey(now: Date): string {
        const resetShifted = new Date(now.getTime() - this.config.dailyResetHourUtc * 60 * 60 * 1000);
        return `${resetShifted.getUTCFullYear()}-${String(resetShifted.getUTCMonth() + 1).padStart(2, "0")}-${String(resetShifted.getUTCDate()).padStart(2, "0")}`;
    }
}
