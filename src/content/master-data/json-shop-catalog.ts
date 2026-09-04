import { readFileSync } from "node:fs";
import path from "node:path";
import {
    ShopItemRewardType,
    ShopItemUserCostType,
    ShopType,
    type EventShopReference,
    type ShopCatalog,
    type ShopItemCost,
    type ShopItemDefinition,
    type ShopItemReward,
    type ShopItemUserCost,
} from "./shop-catalog";
import { InvariantError } from "../../shared/errors/application-error";

type JsonRecord = Record<string, unknown>;
type JsonShopItems = Record<string, JsonRecord>;

function asRecord(value: unknown, label: string): JsonRecord {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new InvariantError(`Invalid ${label} master data.`);
    }
    return value as JsonRecord;
}

function asNumber(value: unknown, label: string): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new InvariantError(`Invalid ${label} master data.`);
    }
    return value;
}

function asString(value: unknown, label: string): string {
    if (typeof value !== "string") throw new InvariantError(`Invalid ${label} master data.`);
    return value;
}

function parseCosts(value: unknown): ShopItemCost[] {
    if (!Array.isArray(value)) throw new InvariantError("Invalid shop item costs master data.");
    return value.map((entry) => {
        const row = asRecord(entry, "shop item cost");
        return {
            id: asNumber(row.id, "shop item cost id"),
            amount: asNumber(row.amount, "shop item cost amount"),
        };
    });
}

function parseRewards(value: unknown): ShopItemReward[] {
    if (!Array.isArray(value)) throw new InvariantError("Invalid shop item rewards master data.");
    return value.map((entry) => {
        const row = asRecord(entry, "shop item reward");
        const type = asNumber(row.type, "shop item reward type") as ShopItemRewardType;
        return {
            type,
            ...(row.id === undefined ? {} : { id: asNumber(row.id, "shop item reward id") }),
            ...(row.count === undefined
                ? {}
                : { count: asNumber(row.count, "shop item reward count") }),
        };
    });
}

function parseUserCost(value: unknown): ShopItemUserCost | undefined {
    if (value === undefined) return undefined;
    const row = asRecord(value, "shop item user cost");
    return {
        type: asNumber(row.type, "shop item user cost type") as ShopItemUserCostType,
        amount: asNumber(row.amount, "shop item user cost amount"),
    };
}

function parseItem(id: number, value: unknown): ShopItemDefinition {
    const row = asRecord(value, `shop item ${id}`);
    const availableUntil = row.availableUntil;
    if (availableUntil !== null && typeof availableUntil !== "string") {
        throw new InvariantError(`Invalid shop item ${id} availableUntil master data.`);
    }
    return {
        id,
        costs: parseCosts(row.costs),
        rewards: parseRewards(row.rewards),
        availableFrom: asString(row.availableFrom, `shop item ${id} availableFrom`),
        availableUntil,
        stock: asNumber(row.stock, `shop item ${id} stock`),
        userCost: parseUserCost(row.userCost),
    };
}

function parseItemRecord(value: unknown): ShopItemDefinition[] {
    const rows = asRecord(value, "shop items");
    return Object.entries(rows).map(([id, item]) => parseItem(Number(id), item));
}

export class JsonShopCatalog implements ShopCatalog {
    private readonly cache = new Map<string, unknown>();

    constructor(private readonly rootDir: string) {}

    findItem(shopType: ShopType, itemId: number): ShopItemDefinition | null {
        switch (shopType) {
            case ShopType.TREASURE:
            case ShopType.GENERAL:
            case ShopType.STAR_GRAIN:
                return this.getGenericItems(shopType).find((item) => item.id === itemId) ?? null;
            case ShopType.BOSS_COIN: {
                const categoryMap = this.load<Record<string, number>>("boss_coin_shop_item_category_map.json");
                const category = categoryMap[String(itemId)];
                return category === undefined
                    ? null
                    : this.getBossCoinItems(category).find((item) => item.id === itemId) ?? null;
            }
            case ShopType.EVENT_ITEM: {
                const idMap = this.load<Record<string, EventShopReference>>("event_item_shop_id_map.json");
                const reference = idMap[String(itemId)];
                return reference === undefined
                    ? null
                    : this.getEventItems(reference.eventType, reference.eventId).find(
                          (item) => item.id === itemId,
                      ) ?? null;
            }
            default:
                return null;
        }
    }

    getGenericItems(shopType: ShopType): ShopItemDefinition[] {
        const file = this.genericFile(shopType);
        if (!file) return [];
        return parseItemRecord(this.load<unknown>(file));
    }

    getBossCoinItems(categoryId: number): ShopItemDefinition[] {
        const root = asRecord(this.load<unknown>("boss_coin_shop.json"), "boss coin shop");
        const rows = root[String(categoryId)];
        return rows === undefined ? [] : parseItemRecord(rows);
    }

    getEventItems(eventType: number, eventId: number): ShopItemDefinition[] {
        const root = asRecord(this.load<unknown>("event_item_shop.json"), "event item shop");
        const type = root[String(eventType)];
        if (type === undefined) return [];
        const typeRecord = asRecord(type, `event item shop type ${eventType}`);
        const rows = typeRecord[String(eventId)];
        return rows === undefined ? [] : parseItemRecord(rows);
    }

    private genericFile(shopType: ShopType): string | null {
        switch (shopType) {
            case ShopType.TREASURE:
                return "treasure_shop.json";
            case ShopType.GENERAL:
                return "general_shop.json";
            case ShopType.STAR_GRAIN:
                return "star_grain_shop.json";
            default:
                return null;
        }
    }

    private load<T>(fileName: string): T {
        const cached = this.cache.get(fileName);
        if (cached !== undefined) return cached as T;
        const filePath = path.join(this.rootDir, fileName);
        let parsed: unknown;
        try {
            parsed = JSON.parse(readFileSync(filePath, "utf8"));
        } catch (error) {
            throw new InvariantError(
                `Unable to load shop master data ${fileName}: ${String(error)}`,
            );
        }
        this.cache.set(fileName, parsed);
        return parsed as T;
    }
}
