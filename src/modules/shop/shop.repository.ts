import type { ShopType } from "../../content/master-data/shop-catalog";
import type { ShopPlayerState, ShopPurchaseState } from "./shop.models";

export interface ShopRepository {
    getPlayerState(playerId: number): ShopPlayerState | null;
    setPlayerState(playerId: number, state: ShopPlayerState): void;
    getItemAmount(playerId: number, itemId: number): number;
    setItemAmount(playerId: number, itemId: number, amount: number): void;
    getPurchaseState(playerId: number, shopType: ShopType, shopItemId: number): ShopPurchaseState | null;
    setPurchaseState(state: ShopPurchaseState): void;
    transaction<T>(work: () => T): T;
}
