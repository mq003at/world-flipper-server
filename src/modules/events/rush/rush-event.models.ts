import type { Reward, RewardGrantResult } from "../../reward/reward.models";

export enum RushEventBattleType {
    FOLDER = 0,
    ENDLESS = 1,
}

export interface RushEventState {
    playerId: number;
    eventId: number;
    activeFolderId: number | null;
    endlessMaxRound: number | null;
    endlessMaxRoundTime: number | null;
    endlessMaxRoundCharacterIds: Array<number | null>;
    endlessMaxRoundEvolutionLevels: Array<number | null>;
}

export interface RushPlayedParty {
    playerId: number;
    eventId: number;
    round: number;
    battleType: RushEventBattleType;
    characterIds: Array<number | null>;
    unisonCharacterIds: Array<number | null>;
    equipmentIds: Array<number | null>;
    abilitySoulIds: Array<number | null>;
    evolutionLevels: Array<number | null>;
    unisonEvolutionLevels: Array<number | null>;
}

export interface RushRankingEntry {
    rankNumber: number;
    bestRound: number;
    elapsedTimeMs: number;
    name: string;
    partyMembers: Array<{ characterId: number; evolutionImgLevel: number }>;
    userRank: number;
}

export interface RushSummaryResult {
    eventId: number;
    nextRound: number;
    activeFolderId: number | null;
    clearedFolderIds: number[];
    folderParties: Record<string, Record<string, number | null>>;
    endlessParties: Record<string, Record<string, number | null>>;
    myRanking: RushRankingEntry | null;
}

export interface RushCompletionPayload {
    rushBattleRewardList: Array<{ kind: number; kindId: number; number: number }>;
    folderParties: Record<string, Record<string, number | null>>;
    endlessParties: Record<string, Record<string, number | null>>;
    isOutOfPeriod: boolean;
    grant: RewardGrantResult | null;
}

export interface RushFolderDefinition {
    eventId: number;
    folderId: number;
    maxRound: number;
    rewards: readonly Reward[];
}
