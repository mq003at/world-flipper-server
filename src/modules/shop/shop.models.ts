import type { ShopItemDefinition, ShopType } from "../../content/master-data/shop-catalog";
import type { RewardGrantResult } from "../reward/reward.models";

export interface ShopPlayerState {
    starCrumb: number;
    freeVmoney: number;
    freeMana: number;
    bondToken: number;
    expPool: number;
    expPooledTime: Date;
}

export interface ShopPurchaseState {
    playerId: number;
    shopType: ShopType;
    shopItemId: number;
    todayPurchaseNum: number;
    todayPeriodKey: string;
    thisMonthPurchaseNum: number;
    monthPeriodKey: string;
    totalPurchaseNum: number;
    updatedAt: Date;
}

export interface ShopSale {
    shopType: ShopType;
    item: ShopItemDefinition;
    stockQuantity: number;
    todayPurchaseNum: number;
    thisMonthPurchaseNum: number;
    totalPurchaseNum: number;
}

export interface ShopBuyResult {
    viewerId: number;
    state: ShopPlayerState;
    grant: RewardGrantResult;
    itemList: Record<string, number>;
    purchase: ShopPurchaseState;
}
