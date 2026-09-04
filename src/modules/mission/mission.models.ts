import type { Reward } from "../reward/reward.models";
import type { GameplayEvent } from "../../live/gameplay-events/gameplay-event";

export type MissionPeriod = "daily" | "weekly" | "regular";
export type MissionProgressMode = "count" | "sum" | "max";
export type MissionRewardPolicy = "time-gated" | "content-bound";

export interface MissionFilter {
    questId?: number;
    questCategory?: number;
    gachaId?: number;
    shopType?: number;
    shopItemId?: number;
}

export interface MissionDefinition {
    id: number;
    period: MissionPeriod;
    eventType: GameplayEvent["type"];
    target: number;
    progressMode: MissionProgressMode;
    filter?: MissionFilter;
    rewards: Reward[];
    rewardPolicy: MissionRewardPolicy;
    scheduleId?: string;
}

export interface MissionProgressState {
    playerId: number;
    missionId: number;
    periodKey: string;
    progress: number;
    completedAt: Date | null;
    claimedAt: Date | null;
    lastEventKey: string | null;
    updatedAt: Date;
}

export interface MissionProgressView {
    definition: MissionDefinition;
    state: MissionProgressState;
}
