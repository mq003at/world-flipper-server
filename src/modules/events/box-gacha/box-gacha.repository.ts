import type {
    BoxGachaPlayerInfo,
    DrawnBoxRewardState,
    PlayerBoxGachaState,
} from "./box-gacha.models";

export interface BoxGachaRepository {
    getBoxState(playerId: number, gachaId: number, boxId: number): PlayerBoxGachaState | null;
    setBoxState(state: PlayerBoxGachaState): void;
    getDrawnRewards(playerId: number, gachaId: number, boxId: number): DrawnBoxRewardState[];
    setDrawnReward(playerId: number, gachaId: number, boxId: number, rewardId: number, number: number): void;
    getItemAmount(playerId: number, itemId: number): number;
    setItemAmount(playerId: number, itemId: number, amount: number): void;
    getPlayerInfo(playerId: number): BoxGachaPlayerInfo | null;
    transaction<T>(work: () => T): T;
}
