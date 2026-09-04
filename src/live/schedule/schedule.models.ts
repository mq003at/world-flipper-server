export type ScheduleKind = "gacha" | "shop" | "event" | "mission" | "mail" | "other";

export interface SourceScheduleEntry {
    id: string;
    kind: ScheduleKind;
    contentId: string;
    sourceStartAt: string;
    sourceEndAt?: string;
    minimumPlayableDurationHours?: number;
    graceHours?: number;
}

export interface CompiledScheduleEntry {
    id: string;
    kind: ScheduleKind;
    contentId: string;
    releaseAt: Date;
    activeUntil: Date;
    graceUntil: Date;
}
