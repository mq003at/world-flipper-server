import type { SeasonConfig } from "./season.models";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SeasonPosition {
    seasonDay: number;
    elapsedDays: number;
    progress: number;
    sourceTime: Date;
    isBeforeSeason: boolean;
    isAfterSeason: boolean;
}

export class SeasonTimeline {
    readonly seasonStartsAt: Date;
    readonly seasonEndsAt: Date;
    readonly sourceStartsAt: Date;
    readonly sourceEndsAt: Date;
    readonly compressionRatio: number;
    readonly minimumPlayableDurationMs: number;

    constructor(readonly config: SeasonConfig) {
        this.seasonStartsAt = new Date(config.seasonStartsAt);
        this.seasonEndsAt = new Date(
            this.seasonStartsAt.getTime() + config.durationDays * DAY_MS,
        );
        this.sourceStartsAt = new Date(config.sourceStartsAt);
        this.sourceEndsAt = new Date(config.sourceEndsAt);
        const sourceDuration = this.sourceEndsAt.getTime() - this.sourceStartsAt.getTime();
        const seasonDuration = this.seasonEndsAt.getTime() - this.seasonStartsAt.getTime();
        this.compressionRatio = sourceDuration / seasonDuration;
        this.minimumPlayableDurationMs = config.minimumPlayableDurationHours * 60 * 60 * 1000;
    }

    mapSourceDate(sourceDate: Date): Date {
        const sourceDuration = this.sourceEndsAt.getTime() - this.sourceStartsAt.getTime();
        if (sourceDuration <= 0) return new Date(this.seasonStartsAt);
        const ratio = (sourceDate.getTime() - this.sourceStartsAt.getTime()) / sourceDuration;
        return new Date(
            this.seasonStartsAt.getTime()
            + ratio * (this.seasonEndsAt.getTime() - this.seasonStartsAt.getTime()),
        );
    }

    scaleSourceDuration(sourceDurationMs: number, minimumMs = this.minimumPlayableDurationMs): number {
        if (sourceDurationMs <= 0) return Math.max(0, minimumMs);
        return Math.max(sourceDurationMs / this.compressionRatio, minimumMs);
    }

    position(now: Date): SeasonPosition {
        const duration = this.seasonEndsAt.getTime() - this.seasonStartsAt.getTime();
        const elapsed = now.getTime() - this.seasonStartsAt.getTime();
        const unclamped = duration <= 0 ? 0 : elapsed / duration;
        const progress = Math.min(1, Math.max(0, unclamped));
        const sourceTime = new Date(
            this.sourceStartsAt.getTime()
            + progress * (this.sourceEndsAt.getTime() - this.sourceStartsAt.getTime()),
        );
        return {
            seasonDay: Math.max(1, Math.floor(Math.max(0, elapsed) / DAY_MS) + 1),
            elapsedDays: elapsed / DAY_MS,
            progress,
            sourceTime,
            isBeforeSeason: elapsed < 0,
            isAfterSeason: now.getTime() >= this.seasonEndsAt.getTime(),
        };
    }
}
