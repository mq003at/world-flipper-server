export type LiveEventKind = "story" | "world-story" | "simple" | "rush" | "ranking" | "raid";

export interface EventQuestRange {
    category: number;
    minQuestId: number;
    maxQuestId: number;
}

export interface EventShopBinding {
    eventType: number;
    eventId: number;
}

export interface EventDefinition {
    id: string;
    kind: LiveEventKind;
    eventId: number;
    scheduleId: string;
    questRanges: readonly EventQuestRange[];
    shopBindings: readonly EventShopBinding[];
    boxGachaIds: readonly number[];
}

export interface ActiveEventView {
    definition: EventDefinition;
    releaseAt: Date;
    activeUntil: Date;
    graceUntil: Date;
}

export interface PlayerEventState {
    playerId: number;
    eventKey: string;
    joinedAt: Date;
    lastSeenAt: Date;
    completedAt: Date | null;
    payload: Record<string, unknown>;
}
