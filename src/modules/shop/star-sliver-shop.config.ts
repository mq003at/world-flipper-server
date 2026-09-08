import { readFileSync } from "node:fs";
import path from "node:path";
import { InvariantError } from "../../shared/errors/application-error";

export interface StarSliverShopConfig {
    initialGrant: number;
    seasonGrant: number;
    currencyItemId: number;
    characterPrices: { "5": number; "4": number };
    astralGems: Array<{
        shopItemId: number;
        rarity: 4 | 5;
        itemId: number;
        price: number;
        stock: number;
    }>;
    allowedReleaseSources: string[];
    includedSpecialCharacterIds: number[];
    rotation: { enabled: boolean; characterIds: number[]; plannedNames: string[] };
}

export function loadStarSliverShopConfig(liveContentDir: string): StarSliverShopConfig {
    const filePath = path.join(liveContentDir, "star-sliver-shop.json");
    const config = JSON.parse(readFileSync(filePath, "utf8")) as StarSliverShopConfig;
    const positive = (value: number) => Number.isSafeInteger(value) && value > 0;
    if (!positive(config.initialGrant) || !positive(config.seasonGrant) || !positive(config.currencyItemId)
        || !positive(config.characterPrices?.["5"]) || !positive(config.characterPrices?.["4"])) {
        throw new InvariantError("Invalid Star Sliver shop currency or price configuration.");
    }
    if (!Array.isArray(config.allowedReleaseSources) || config.allowedReleaseSources.length === 0
        || config.allowedReleaseSources.some((source) => typeof source !== "string" || source.length === 0)
        || !Array.isArray(config.includedSpecialCharacterIds)
        || config.includedSpecialCharacterIds.some((id) => !positive(id))) {
        throw new InvariantError("Invalid Star Sliver character eligibility configuration.");
    }
    if (!Array.isArray(config.astralGems) || config.astralGems.length !== 2
        || config.astralGems.some((gem) => !positive(gem.shopItemId) || !positive(gem.itemId)
            || !positive(gem.price) || (gem.rarity !== 4 && gem.rarity !== 5)
            || (!Number.isSafeInteger(gem.stock) || gem.stock === 0 || gem.stock < -1))) {
        throw new InvariantError("Invalid Star Sliver Astral Gem configuration.");
    }
    if (!config.rotation || !Array.isArray(config.rotation.characterIds)
        || config.rotation.characterIds.some((id) => !positive(id))) {
        throw new InvariantError("Invalid Star Sliver rotation configuration.");
    }
    return config;
}
