import type { BattleQuestDefinition, QuestCategory } from "../../content/master-data/quest-catalog";
import type { RewardGrantResult } from "../reward/reward.models";
import type { PartyStatistics } from "./quest.models";

export interface QuestFinishExtensionContext {
    playerId: number;
    viewerId: number;
    category: QuestCategory;
    questId: number;
    quest: BattleQuestDefinition;
    elapsedTimeMs: number;
    isAccomplished: boolean;
    statistics: PartyStatistics;
}

export interface QuestFinishExtensionResult {
    rushEvent?: unknown;
    grant?: RewardGrantResult | null;
}

export interface QuestFinishExtension {
    afterCoreFinish(context: QuestFinishExtensionContext): QuestFinishExtensionResult | null;
}

export const NOOP_QUEST_FINISH_EXTENSION: QuestFinishExtension = {
    afterCoreFinish: () => null,
};
