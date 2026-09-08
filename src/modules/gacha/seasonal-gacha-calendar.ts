import type { GachaRotationConfig } from "./gacha-rotation.config";
import type { CalendarBannerWindow, SeasonPosition } from "./seasonal-gacha.models";

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
        const windows = this.regularWindows(seasonNumber);
        const cycleIndex = Math.max(0, windows.findIndex((window) => now >= window.startsAt && now < window.endsAt));
        const selected = windows[cycleIndex] ?? windows[windows.length - 1];
        if (!selected) throw new Error("Season has no regular gacha windows.");
        const cycleStart = selected.startsAt;
        const cycleEndExclusive = selected.endsAt;
        return { seasonNumber, seasonStart, seasonEndExclusive, cycleIndex, cycleStart, cycleEndExclusive };
    }

    /**
     * Split every calendar month into nominal seven-day runs. A remainder shorter
     * than seven days is appended to the final run, so no month-end micro-banner
     * is created. Gregorian months produce final runs of 7-10 days (under the
     * explicit 13-day safety limit).
     */
    regularWindows(seasonNumber: number): CalendarBannerWindow[] {
        const seasonStart = this.seasonStart(seasonNumber);
        const localStart = localParts(seasonStart, this.config.timezoneOffsetMinutes);
        const result: CalendarBannerWindow[] = [];
        let cycleIndex = 0;
        for (let offset = 0; offset < this.config.seasonMonths; offset += 1) {
            const absoluteMonth = localStart.getUTCFullYear() * 12 + localStart.getUTCMonth() + offset;
            const year = Math.floor(absoluteMonth / 12);
            const month = ((absoluteMonth % 12) + 12) % 12;
            const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
            const fullRuns = Math.floor(days / 7);
            const remainder = days % 7;
            for (let run = 0; run < fullRuns; run += 1) {
                const startDay = run * 7 + 1;
                const length = 7 + (run === fullRuns - 1 ? remainder : 0);
                result.push({
                    cycleIndex,
                    startsAt: utcFromLocal(year, month, startDay, this.config.timezoneOffsetMinutes),
                    endsAt: utcFromLocal(year, month, startDay + length, this.config.timezoneOffsetMinutes),
                });
                cycleIndex += 1;
            }
        }
        return result;
    }

    meteorWindows(seasonNumber: number): Array<CalendarBannerWindow & { slot: "meteor-1" | "meteor-2" }> {
        return this.months(seasonNumber).flatMap(({ year, month }, monthIndex) => {
            const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
            const baseIndex = 10_000 + monthIndex * 2;
            return [
                { slot: "meteor-1" as const, cycleIndex: baseIndex, startsAt: utcFromLocal(year, month, lastDay - 13, this.config.timezoneOffsetMinutes), endsAt: utcFromLocal(year, month, lastDay - 6, this.config.timezoneOffsetMinutes) },
                { slot: "meteor-2" as const, cycleIndex: baseIndex + 1, startsAt: utcFromLocal(year, month, lastDay - 6, this.config.timezoneOffsetMinutes), endsAt: utcFromLocal(year, month + 1, 1, this.config.timezoneOffsetMinutes) },
            ];
        });
    }

    anniversaryWindows(seasonNumber: number): CalendarBannerWindow[] {
        return this.months(seasonNumber).map(({ year, month }, index) => {
            const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
            return {
                cycleIndex: 20_000 + index,
                startsAt: utcFromLocal(year, month, lastDay - 6, this.config.timezoneOffsetMinutes),
                endsAt: utcFromLocal(year, month + 1, 1, this.config.timezoneOffsetMinutes),
            };
        });
    }

    rerunWindows(seasonNumber: number): CalendarBannerWindow[] {
        const regular = this.regularWindows(seasonNumber);
        const seasonStart = this.seasonStart(seasonNumber);
        const firstStart = new Date(seasonStart.getTime() + 20 * DAY_MS);
        const firstMonthEnd = this.months(seasonNumber)[0];
        if (!firstMonthEnd) return [];
        const firstEnd = utcFromLocal(firstMonthEnd.year, firstMonthEnd.month + 1, 1, this.config.timezoneOffsetMinutes);
        return [
            { cycleIndex: 30_000, startsAt: firstStart, endsAt: firstEnd },
            ...regular.filter((window) => window.startsAt >= firstEnd),
        ];
    }

    dayOfSeason(now: Date): number {
        const position = this.position(now);
        return Math.floor((now.getTime() - position.seasonStart.getTime()) / DAY_MS) + 1;
    }

    isMonthEndCampaign(now: Date): boolean {
        const local = localParts(now, this.config.timezoneOffsetMinutes);
        const lastDay = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate();
        return local.getUTCDate() >= lastDay - 6;
    }

    dayKey(now: Date): string {
        const resetShifted = new Date(now.getTime() - this.config.dailyResetHourUtc * 60 * 60 * 1000);
        return `${resetShifted.getUTCFullYear()}-${String(resetShifted.getUTCMonth() + 1).padStart(2, "0")}-${String(resetShifted.getUTCDate()).padStart(2, "0")}`;
    }

    private seasonStart(seasonNumber: number): Date {
        const anchorMonth = this.anchorLocal.getUTCFullYear() * 12 + this.anchorLocal.getUTCMonth();
        const absoluteMonth = anchorMonth + (seasonNumber - 1) * this.config.seasonMonths;
        return utcFromLocal(Math.floor(absoluteMonth / 12), ((absoluteMonth % 12) + 12) % 12, 1, this.config.timezoneOffsetMinutes);
    }

    private months(seasonNumber: number): Array<{ year: number; month: number }> {
        const local = localParts(this.seasonStart(seasonNumber), this.config.timezoneOffsetMinutes);
        const start = local.getUTCFullYear() * 12 + local.getUTCMonth();
        return Array.from({ length: this.config.seasonMonths }, (_, offset) => {
            const absolute = start + offset;
            return { year: Math.floor(absolute / 12), month: ((absolute % 12) + 12) % 12 };
        });
    }
}
