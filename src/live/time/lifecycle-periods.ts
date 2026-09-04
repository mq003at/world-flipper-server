const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
        date.getUTCDate(),
    ).padStart(2, "0")}`;
}

export class LifecyclePeriods {
    constructor(
        private readonly dailyResetHourUtc: number,
        private readonly weekStartsOnUtcDay: number,
    ) {}

    dailyKey(now: Date): string {
        const shifted = new Date(now.getTime() - this.dailyResetHourUtc * 60 * 60 * 1000);
        return dateKey(shifted);
    }

    weeklyKey(now: Date): string {
        const shifted = new Date(now.getTime() - this.dailyResetHourUtc * 60 * 60 * 1000);
        const day = shifted.getUTCDay();
        const delta = (day - this.weekStartsOnUtcDay + 7) % 7;
        const start = new Date(shifted.getTime() - delta * DAY_MS);
        return `week:${dateKey(start)}`;
    }
}
