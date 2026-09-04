import { readFileSync } from "node:fs";
import path from "node:path";
import { RewardType, type Reward } from "../../modules/reward/reward.models";
import {
    QuestCategory,
    ScoreRewardType,
    type BattleQuestDefinition,
    type CommonScoreRewardDefinition,
    type QuestCatalog,
    type QuestDefinition,
    type RarePoolScoreRewardDefinition,
    type RareScoreRewardDefinition,
    type ScoreRewardDefinition,
    type StoryQuestDefinition,
} from "./quest-catalog";

interface RawQuest {
    name: string;
    clearRewardId?: number;
    sPlusRewardId?: number;
    scoreRewardGroup?: number;
    bRankTime?: number;
    aRankTime?: number;
    sRankTime?: number;
    sPlusRankTime?: number;
    rankPointReward?: number;
    characterExpReward?: number;
    manaReward?: number;
    poolExpReward?: number;
    fixedParty?: number;
}

type RawQuestMap = Record<string, RawQuest>;
type RawReward = { type: number; id?: number; count?: number };
type RawRewardMap = Record<string, RawReward>;
type RawScoreReward = {
    type: number;
    reward_type?: number;
    id?: number;
    count?: number;
    rarity?: number;
};
type RawScoreRewardMap = Record<string, RawScoreReward[]>;

type CatalogMap = Map<QuestCategory, Map<number, QuestDefinition>>;

const QUEST_FILES: Partial<Record<QuestCategory, string>> = {
    [QuestCategory.MAIN]: "main_quest.json",
    [QuestCategory.BOSS_BATTLE]: "boss_battle_quest.json",
    [QuestCategory.CHARACTER]: "character_quest.json",
    [QuestCategory.EX]: "ex_quest.json",
    [QuestCategory.DAILY_WEEK_EVENT]: "daily_week_event_quest.json",
    [QuestCategory.STORY_EVENT_SINGLE]: "story_event_single_quest.json",
    [QuestCategory.DAILY_EXP_MANA_EVENT]: "daily_exp_mana_event_quest.json",
    [QuestCategory.WORLD_STORY_EVENT]: "world_story_event_quest.json",
    [QuestCategory.WORLD_STORY_EVENT_BOSS_BATTLE]: "world_story_event_boss_battle_quest.json",
};

function readJson<T>(masterDataDir: string, fileName: string): T {
    return JSON.parse(readFileSync(path.join(masterDataDir, fileName), "utf8")) as T;
}

function toReward(raw: RawReward | undefined): Reward | undefined {
    if (!raw) return undefined;

    switch (raw.type) {
        case RewardType.ITEM:
        case RewardType.EQUIPMENT:
            if (raw.id === undefined || raw.count === undefined) return undefined;
            return { type: raw.type, id: raw.id, count: raw.count };
        case RewardType.CHARACTER:
            if (raw.id === undefined) return undefined;
            return { type: RewardType.CHARACTER, id: raw.id };
        case RewardType.BEADS:
        case RewardType.MANA:
        case RewardType.EXP:
            if (raw.count === undefined) return undefined;
            return { type: raw.type, count: raw.count };
        default:
            return undefined;
    }
}

export class JsonQuestCatalog implements QuestCatalog {
    private readonly quests: CatalogMap = new Map();
    private readonly scoreRewardGroups: Map<number, readonly ScoreRewardDefinition[]>;
    private readonly rareScoreRewardGroups: Map<number, readonly RareScoreRewardDefinition[]>;

    constructor(masterDataDir: string) {
        const clearRewards = readJson<RawRewardMap>(masterDataDir, "clear_reward.json");

        for (const [rawCategory, fileName] of Object.entries(QUEST_FILES)) {
            if (!fileName) continue;
            const category = Number(rawCategory) as QuestCategory;
            const rawQuests = readJson<RawQuestMap>(masterDataDir, fileName);
            const questMap = new Map<number, QuestDefinition>();

            for (const [rawId, raw] of Object.entries(rawQuests)) {
                const id = Number(rawId);
                const clearReward = raw.clearRewardId === undefined
                    ? undefined
                    : toReward(clearRewards[String(raw.clearRewardId)]);

                const isBattle = raw.manaReward !== undefined;
                if (!isBattle) {
                    const quest: StoryQuestDefinition = {
                        kind: "story",
                        id,
                        category,
                        name: raw.name,
                        ...(clearReward ? { clearReward } : {}),
                    };
                    questMap.set(id, quest);
                    continue;
                }

                const sPlusReward = raw.sPlusRewardId === undefined
                    ? undefined
                    : toReward(clearRewards[String(raw.sPlusRewardId)]);
                const quest: BattleQuestDefinition = {
                    kind: "battle",
                    id,
                    category,
                    name: raw.name,
                    ...(clearReward ? { clearReward } : {}),
                    ...(sPlusReward ? { sPlusReward } : {}),
                    ...(raw.scoreRewardGroup === undefined
                        ? {}
                        : { scoreRewardGroupId: raw.scoreRewardGroup }),
                    bRankTime: raw.bRankTime ?? 0,
                    aRankTime: raw.aRankTime ?? 0,
                    sRankTime: raw.sRankTime ?? 0,
                    sPlusRankTime: raw.sPlusRankTime ?? 0,
                    rankPointReward: raw.rankPointReward ?? 0,
                    characterExpReward: raw.characterExpReward ?? 0,
                    manaReward: raw.manaReward ?? 0,
                    poolExpReward: raw.poolExpReward ?? 0,
                    ...(raw.fixedParty === undefined ? {} : { fixedParty: raw.fixedParty }),
                };
                questMap.set(id, quest);
            }

            this.quests.set(category, questMap);
        }

        const rawScoreRewards = readJson<RawScoreRewardMap>(masterDataDir, "score_reward.json");
        this.scoreRewardGroups = new Map(
            Object.entries(rawScoreRewards).map(([rawGroupId, group]) => [
                Number(rawGroupId),
                group.flatMap((raw): ScoreRewardDefinition[] => {
                    if (raw.type === ScoreRewardType.ITEM) {
                        if (raw.reward_type === undefined || raw.count === undefined) return [];
                        const item: CommonScoreRewardDefinition = {
                            type: ScoreRewardType.ITEM,
                            rewardType: raw.reward_type,
                            count: raw.count,
                            ...(raw.id === undefined ? {} : { id: raw.id }),
                        };
                        return [item];
                    }
                    if (raw.type === ScoreRewardType.RARE_POOL && raw.id !== undefined) {
                        const item: RarePoolScoreRewardDefinition = {
                            type: ScoreRewardType.RARE_POOL,
                            id: raw.id,
                            rarity: raw.rarity ?? 0,
                        };
                        return [item];
                    }
                    return [];
                }),
            ]),
        );

        const rawRareRewards = readJson<RawScoreRewardMap>(masterDataDir, "rare_score_reward.json");
        this.rareScoreRewardGroups = new Map(
            Object.entries(rawRareRewards).map(([rawGroupId, group]) => [
                Number(rawGroupId),
                group.map((raw) => ({
                    type: raw.type,
                    ...(raw.id === undefined ? {} : { id: raw.id }),
                    ...(raw.count === undefined ? {} : { count: raw.count }),
                    rarity: raw.rarity ?? 0,
                })),
            ]),
        );
    }

    findQuest(category: QuestCategory, questId: number): QuestDefinition | null {
        return this.quests.get(category)?.get(questId) ?? null;
    }

    getScoreRewardGroup(groupId: number): readonly ScoreRewardDefinition[] {
        return this.scoreRewardGroups.get(groupId) ?? [];
    }

    getRareScoreRewardGroup(groupId: number): readonly RareScoreRewardDefinition[] {
        return this.rareScoreRewardGroups.get(groupId) ?? [];
    }
}
