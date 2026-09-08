import type { CharacterCatalog } from "../../content/master-data/character-catalog";
import { ShopItemRewardType, type ShopItemDefinition } from "../../content/master-data/shop-catalog";
import type { DatabaseConnection } from "../../infrastructure/database/database";
import type { SeasonalGachaCalendar } from "../gacha/seasonal-gacha-calendar";
import type { StarSliverShopConfig } from "./star-sliver-shop.config";

const CHARACTER_ITEM_BASE = 10_000_000;
const AVAILABLE_FROM = "2016-10-26 15:00:00";

export class StarSliverShopCatalog {
    constructor(
        private readonly database: DatabaseConnection,
        private readonly characters: CharacterCatalog,
        private readonly calendar: SeasonalGachaCalendar,
        private readonly config: StarSliverShopConfig,
    ) {}

    list(now: Date): ShopItemDefinition[] {
        const season = this.calendar.position(now).seasonNumber;
        const rows = this.database.prepare(`
            SELECT unit_id, source_banner_type
            FROM season_unit_release
            WHERE season_number = ? AND content_type = 'character' AND released_at <= ?
            ORDER BY unit_id
        `).all(season, now.toISOString()) as Array<{ unit_id: number; source_banner_type: string }>;
        const includedSpecial = new Set(this.config.includedSpecialCharacterIds);
        const allowedSources = new Set(this.config.allowedReleaseSources);
        const rotation = new Set(this.config.rotation.characterIds);
        const characterIds = rows
            .filter((row) => allowedSources.has(row.source_banner_type) || includedSpecial.has(row.unit_id))
            .filter((row) => row.source_banner_type === "base" || !this.config.rotation.enabled || rotation.has(row.unit_id))
            .map((row) => row.unit_id);

        const characterItems = [...new Set(characterIds)].flatMap((id) => {
            const character = this.characters.findById(id);
            if (!character || (character.rarity !== 4 && character.rarity !== 5)) return [];
            return [{
                id: CHARACTER_ITEM_BASE + id,
                costs: [{ id: this.config.currencyItemId, amount: this.config.characterPrices[String(character.rarity) as "4" | "5"] }],
                rewards: [{ type: ShopItemRewardType.CHARACTER, id, count: 1 }],
                availableFrom: AVAILABLE_FROM,
                availableUntil: null,
                stock: -1,
            } satisfies ShopItemDefinition];
        });
        const gemItems = this.config.astralGems.map((gem) => ({
            id: gem.shopItemId,
            costs: [{ id: this.config.currencyItemId, amount: gem.price }],
            rewards: [{ type: ShopItemRewardType.ITEM, id: gem.itemId, count: 1 }],
            availableFrom: AVAILABLE_FROM,
            availableUntil: null,
            stock: gem.stock,
        } satisfies ShopItemDefinition));
        return [...characterItems, ...gemItems];
    }

    find(itemId: number, now: Date): ShopItemDefinition | null {
        return this.list(now).find((item) => item.id === itemId) ?? null;
    }
}
