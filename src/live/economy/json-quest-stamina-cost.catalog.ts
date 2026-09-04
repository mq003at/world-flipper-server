import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { QuestCategory } from "../../content/master-data/quest-catalog";
import type { QuestStaminaCostCatalog } from "./quest-stamina-cost.catalog";

export class JsonQuestStaminaCostCatalog implements QuestStaminaCostCatalog {
    private readonly values: Record<string, number>;

    constructor(liveContentDir: string) {
        const filePath = path.join(liveContentDir, "quest-stamina-costs.json");
        this.values = existsSync(filePath)
            ? JSON.parse(readFileSync(filePath, "utf8")) as Record<string, number>
            : {};
    }

    findBaseCost(category: QuestCategory, questId: number): number | null {
        const value = this.values[`${category}:${questId}`];
        return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
    }
}
