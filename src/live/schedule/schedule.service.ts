import type { SeasonTimeline } from "../time/season-timeline";
import type { ScheduleCatalog } from "./schedule.catalog";
import type { CompiledScheduleEntry, ScheduleKind, SourceScheduleEntry } from "./schedule.models";

export class ScheduleService {
    private readonly compiled: Map<string, CompiledScheduleEntry>;

    constructor(catalog: ScheduleCatalog, timeline: SeasonTimeline) {
        this.compiled = new Map(
            catalog.list().map((entry) => {
                const compiled = this.compile(entry, timeline);
                return [compiled.id, compiled];
            }),
        );
    }

    get(id: string): CompiledScheduleEntry | null {
        return this.compiled.get(id) ?? null;
    }

    isActive(id: string, now: Date): boolean {
        const entry = this.compiled.get(id);
        return entry !== undefined
            && now.getTime() >= entry.releaseAt.getTime()
            && now.getTime() < entry.activeUntil.getTime();
    }

    /** True after the content release instant, even after its active window closes. */
    isReleased(id: string, now: Date): boolean {
        const entry = this.compiled.get(id);
        return entry !== undefined && now.getTime() >= entry.releaseAt.getTime();
    }

    /** Active window plus the configured post-close grace period. */
    isWithinGrace(id: string, now: Date): boolean {
        const entry = this.compiled.get(id);
        return entry !== undefined
            && now.getTime() >= entry.releaseAt.getTime()
            && now.getTime() < entry.graceUntil.getTime();
    }


    getForContent(kind: ScheduleKind, contentId: string): CompiledScheduleEntry[] {
        return [...this.compiled.values()].filter(
            (entry) => entry.kind === kind && entry.contentId === contentId,
        );
    }

    getActive(kind: ScheduleKind, now: Date): CompiledScheduleEntry[] {
        return [...this.compiled.values()].filter(
            (entry) => entry.kind === kind
                && now.getTime() >= entry.releaseAt.getTime()
                && now.getTime() < entry.activeUntil.getTime(),
        );
    }

    private compile(entry: SourceScheduleEntry, timeline: SeasonTimeline): CompiledScheduleEntry {
        const sourceStart = new Date(entry.sourceStartAt);
        const releaseAt = timeline.mapSourceDate(sourceStart);
        const minimumMs = (entry.minimumPlayableDurationHours ?? timeline.config.minimumPlayableDurationHours)
            * 60 * 60 * 1000;
        const sourceEnd = entry.sourceEndAt ? new Date(entry.sourceEndAt) : sourceStart;
        const sourceDuration = Math.max(0, sourceEnd.getTime() - sourceStart.getTime());
        const duration = timeline.scaleSourceDuration(sourceDuration, minimumMs);
        const activeUntil = new Date(releaseAt.getTime() + duration);
        const graceUntil = new Date(
            activeUntil.getTime() + Math.max(0, entry.graceHours ?? 0) * 60 * 60 * 1000,
        );
        return { id: entry.id, kind: entry.kind, contentId: entry.contentId, releaseAt, activeUntil, graceUntil };
    }
}
