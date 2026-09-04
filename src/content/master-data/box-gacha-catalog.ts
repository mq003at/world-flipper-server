export enum BoxGachaRewardType {
    ITEM = 0,
    EQUIPMENT = 1,
    EMPTY = 2,
    MANA = 3,
    EXP = 4,
    CHARACTER = 5,
}

export enum BoxGachaRewardTier {
    COMMON = 0,
    RARE = 1,
    FEATURED = 2,
}

export interface BoxGachaRewardDefinition {
    rewardId: number;
    type: BoxGachaRewardType;
    count: number;
    available: number;
    tier: BoxGachaRewardTier;
    id?: number;
}

export interface BoxGachaBoxDefinition {
    boxId: number;
    availableCount: number;
    rewards: readonly BoxGachaRewardDefinition[];
}

export interface BoxGachaDefinition {
    id: number;
    redeemItemId: number;
    redeemItemCount: number;
    boxes: readonly BoxGachaBoxDefinition[];
}

export interface BoxGachaCatalog {
    findById(id: number): BoxGachaDefinition | null;
}
