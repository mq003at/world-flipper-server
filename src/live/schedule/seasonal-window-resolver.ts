import type { SeasonTimeline } from "../time/season-timeline";

export interface SeasonalWindow {
    releaseAt: Date;
    activeUntil: Date | null;
}

/**
 * Parses converter/master timestamps deterministically as UTC when they do not
 * already include an offset. World Flipper Global master data commonly stores
 * values as `YYYY-MM-DD HH:mm:ss`.
 */
export function parseSourceTimestamp(value: string): Date | null {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const normalized = /(?:Z|[+-]\d\d:?\d\d)$/i.test(trimmed)
        ? trimmed.replace(" ", "T")
        : `${trimmed.replace(" ", "T")}Z`;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export class SeasonalWindowResolver {
    constructor(private readonly timeline: SeasonTimeline) {}

    resolve(sourceStartAt: string, sourceEndAt?: string | null): SeasonalWindow | null {
        const sourceStart = parseSourceTimestamp(sourceStartAt);
        if (!sourceStart) return null;
        const releaseAt = this.timeline.mapSourceDate(sourceStart);
        if (!sourceEndAt) return { releaseAt, activeUntil: null };
        const sourceEnd = parseSourceTimestamp(sourceEndAt);
        if (!sourceEnd) return { releaseAt, activeUntil: null };
        const sourceDuration = Math.max(0, sourceEnd.getTime() - sourceStart.getTime());
        return {
            releaseAt,
            activeUntil: new Date(
                releaseAt.getTime()
                + this.timeline.scaleSourceDuration(sourceDuration, this.timeline.minimumPlayableDurationMs),
            ),
        };
    }

    isActive(sourceStartAt: string, sourceEndAt: string | null | undefined, now: Date): boolean {
        const window = this.resolve(sourceStartAt, sourceEndAt);
        if (!window) return true; // malformed/missing compatibility data must not brick the emulator
        if (now.getTime() < window.releaseAt.getTime()) return false;
        return window.activeUntil === null || now.getTime() < window.activeUntil.getTime();
    }
}
