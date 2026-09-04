import type { PlayerQuestProgress } from "../player/player.models";
import type { RewardGrantResult } from "../reward/reward.models";
import type { QuestCategory } from "../../content/master-data/quest-catalog";

export interface ActiveQuest {
    playerId: number;
    questId: number;
    category: QuestCategory;
    useBossBoostPoint: boolean;
    useBoostPoint: boolean;
    isAutoStartMode: boolean;
    partyId: number;
    playId: string;
    startedAt: Date;
}


export interface QuestStartResult {
    stamina: number;
    staminaHealTime: Date;
    staminaCost: number;
}

export interface QuestPlayerState {
    playerId: number;
    stamina: number;
    staminaHealTime: Date;
    boostPoint: number;
    bossBoostPoint: number;
    vmoney: number;
    freeVmoney: number;
    rankPoint: number;
    expPool: number;
    expPooledTime: Date;
    freeMana: number;
    partySlot: number;
}

export interface PartyStatistics {
    characters: Array<number | null>;
    unisonCharacters: Array<number | null>;
    equipmentIds: Array<number | null>;
    abilitySoulIds: Array<number | null>;
}

export interface DropRewardId {
    group_id: number;
    index: number;
    number: number;
}

export interface CharacterExpEntry {
    character_id: number;
    add_exp: number;
    after_exp: number;
    add_exp_pool: number;
}

export interface CharacterExpCharacter {
    character_id: number;
    exp: number;
    create_time: string;
    update_time: string;
    join_time: string;
    exp_total: number;
}

export interface BondTokenStatus {
    mana_board_index: number;
    status: number;
}

export interface CharacterExpResult {
    addExpList: CharacterExpEntry[];
    characterList: CharacterExpCharacter[];
    bondTokenStatusList: Record<
        string,
        { before: BondTokenStatus[]; after: BondTokenStatus[] }
    >;
    overflowExp: number;
}

export interface ScoreRewardResult {
    grant: RewardGrantResult | null;
    dropScoreRewardIds: DropRewardId[];
    dropRareRewardIds: DropRewardId[];
}

export interface StoryFinishResult {
    viewerId: number;
    alreadyFinished: boolean;
    player: QuestPlayerState;
    grant: RewardGrantResult | null;
}

export interface BattleFinishResult {
    viewerId: number;
    category: QuestCategory;
    clearRank: number;
    oldHighScore: number;
    beforeRankPoint: number;
    player: QuestPlayerState;
    questPoolExpReward: number;
    questManaReward: number;
    fieldMana: number;
    characterExp: CharacterExpResult;
    clearGrant: RewardGrantResult | null;
    sPlusGrant: RewardGrantResult | null;
    scoreRewards: ScoreRewardResult;
}

export type QuestProgress = PlayerQuestProgress;
