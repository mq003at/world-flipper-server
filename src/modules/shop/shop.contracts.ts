import { ShopType } from "../../content/master-data/shop-catalog";
import { InvalidRequestError } from "../../shared/errors/application-error";

export interface GetSalesListRequest {
    equipmentEnhancementShopCategoryIds: number[];
    bossCoinShopCategoryIds: number[];
    browseTreasureFlag: boolean;
    shopTypes: ShopType[];
    eventList: Array<{ eventType: number; eventIds: number[] }>;
    viewerId: number;
}

export interface BuyShopItemRequest {
    shopType: ShopType;
    apiCount: number;
    shopItemId: number;
    number: number;
    viewerId: number;
}

function asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new InvalidRequestError();
    }
    return value as Record<string, unknown>;
}

function numberField(body: Record<string, unknown>, key: string): number {
    const value = body[key];
    if (typeof value !== "number" || !Number.isFinite(value)) throw new InvalidRequestError();
    return value;
}

function booleanField(body: Record<string, unknown>, key: string, fallback = false): boolean {
    const value = body[key];
    if (value === undefined) return fallback;
    if (typeof value !== "boolean") throw new InvalidRequestError();
    return value;
}

function numberArray(value: unknown): number[] {
    if (!Array.isArray(value)) throw new InvalidRequestError();
    return value.map((entry) => {
        if (typeof entry !== "number" || !Number.isFinite(entry)) throw new InvalidRequestError();
        return entry;
    });
}

export function parseBuyShopItemRequest(value: unknown): BuyShopItemRequest {
    const body = asRecord(value);
    return {
        shopType: numberField(body, "shop_type") as ShopType,
        apiCount: typeof body.api_count === "number" ? body.api_count : 0,
        shopItemId: numberField(body, "shop_item_id"),
        number: numberField(body, "number"),
        viewerId: numberField(body, "viewer_id"),
    };
}

export function parseGetSalesListRequest(value: unknown): GetSalesListRequest {
    const body = asRecord(value);
    const rawEvents = body.event_list;
    if (!Array.isArray(rawEvents)) throw new InvalidRequestError();
    return {
        equipmentEnhancementShopCategoryIds: numberArray(
            body.equipment_enhancement_shop_category_ids ?? [],
        ),
        bossCoinShopCategoryIds: numberArray(body.boss_coin_shop_category_ids ?? []),
        browseTreasureFlag: booleanField(body, "browse_treasure_flag"),
        shopTypes: numberArray(body.shop_types ?? []).map((type) => type as ShopType),
        eventList: rawEvents.map((entry) => {
            const event = asRecord(entry);
            return {
                eventType: numberField(event, "event_type"),
                eventIds: numberArray(event.event_ids),
            };
        }),
        viewerId: numberField(body, "viewer_id"),
    };
}
