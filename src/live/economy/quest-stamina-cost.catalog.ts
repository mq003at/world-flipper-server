import type { QuestCategory } from "../../content/master-data/quest-catalog";

export interface QuestStaminaCostCatalog {
    findBaseCost(category: QuestCategory, questId: number): number | null;
}
