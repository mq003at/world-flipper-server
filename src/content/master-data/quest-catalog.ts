import type { Reward } from "../../modules/reward/reward.models";

// Numeric values match the World Flipper client/master-data contract.
export enum QuestCategory {
    EMPTY = 0,
    MAIN = 1,
    BOSS_BATTLE = 2,
    CHARACTER = 3,
    EX = 4,
    EMPTY2 = 5,
    DAILY_WEEK_EVENT = 6,
    ADVENT_EVENT_SINGLE = 7,
    ADVENT_EVENT_MULTI = 8,
    TUTORIAL = 9,
    STORY_EVENT_SINGLE = 10,
    RANKING_EVENT_SINGLE = 11,
    EMPTY3 = 12,
    CHALLENGE_DUNGEON_EVENT = 13,
    DAILY_EXP_MANA_EVENT = 14,
    PRACTICE = 15,
    SKILL_PREVIEW = 16,
    EMPTY4 = 17,
    WORLD_STORY_EVENT = 18,
    WORLD_STORY_EVENT_BOSS_BATTLE = 19,
    TOWER_DUNGEON_EVENT = 20,
    EXPERT_SINGLE_EVENT = 21,
    CARNIVAL_EVENT = 22,
    RAID_EVENT = 23,
    RUSH_EVENT = 24,
    SOLO_TIME_ATTACK_EVENT = 25,
    HARD_MULTI_EVENT = 26,
    SCORE_ATTACK_EVENT = 27,
}

export interface StoryQuestDefinition {
    kind: "story";
    id: number;
    category: QuestCategory;
    name: string;
    clearReward?: Reward;
}

export interface BattleQuestDefinition {
    kind: "battle";
    id: number;
    category: QuestCategory;
    name: string;
    clearReward?: Reward;
    sPlusReward?: Reward;
    scoreRewardGroupId?: number;
    bRankTime: number;
    aRankTime: number;
    sRankTime: number;
    sPlusRankTime: number;
    rankPointReward: number;
    characterExpReward: number;
    manaReward: number;
    poolExpReward: number;
    fixedParty?: number;
}

export type QuestDefinition = StoryQuestDefinition | BattleQuestDefinition;

export enum ScoreRewardType {
    ITEM = 0,
    RARE_POOL = 1,
}

export interface CommonScoreRewardDefinition {
    type: ScoreRewardType.ITEM;
    rewardType: number;
    id?: number;
    count: number;
}

export interface RarePoolScoreRewardDefinition {
    type: ScoreRewardType.RARE_POOL;
    id: number;
    rarity: number;
}

export type ScoreRewardDefinition =
    | CommonScoreRewardDefinition
    | RarePoolScoreRewardDefinition;

export interface RareScoreRewardDefinition {
    type: number;
    id?: number;
    count?: number;
    rarity: number;
}

export interface QuestCatalog {
    findQuest(category: QuestCategory, questId: number): QuestDefinition | null;
    getScoreRewardGroup(groupId: number): readonly ScoreRewardDefinition[];
    getRareScoreRewardGroup(groupId: number): readonly RareScoreRewardDefinition[];
}
