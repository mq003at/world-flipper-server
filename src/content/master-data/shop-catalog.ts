export enum ShopType {
    U0 = 0,
    U1 = 1,
    TREASURE = 2,
    SPECIAL_PACK = 3,
    EVENT_ITEM = 4,
    U5 = 5,
    U6 = 6,
    BOSS_COIN = 7,
    GENERAL = 8,
    STAR_GRAIN = 9,
    STAR_SLIVER = 9,
}

export enum ShopItemRewardType {
    ITEM = 0,
    EXP = 1,
    MANA = 2,
    CHARACTER = 3,
    EQUIPMENT = 4,
}

export enum ShopItemUserCostType {
    BEADS = 0,
    MANA = 1,
    AMITY_SCROLL = 2,
}

export interface ShopItemCost {
    id: number;
    amount: number;
}

export interface ShopItemReward {
    type: ShopItemRewardType;
    id?: number;
    count?: number;
}

export interface ShopItemUserCost {
    type: ShopItemUserCostType;
    amount: number;
}

export interface ShopItemDefinition {
    id: number;
    costs: ShopItemCost[];
    rewards: ShopItemReward[];
    availableFrom: string;
    availableUntil: string | null;
    stock: number;
    userCost?: ShopItemUserCost;
}

export interface EventShopReference {
    eventType: number;
    eventId: number;
}

export interface ShopCatalog {
    findItem(shopType: ShopType, itemId: number): ShopItemDefinition | null;
    findEventReferenceForItem(itemId: number): EventShopReference | null;
    getGenericItems(shopType: ShopType): ShopItemDefinition[];
    getBossCoinItems(categoryId: number): ShopItemDefinition[];
    getEventItems(eventType: number, eventId: number): ShopItemDefinition[];
}
