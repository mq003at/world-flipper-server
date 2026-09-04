import type {
    GachaPlayerWallet,
    PlayerGachaCampaignState,
    PlayerGachaInfoState,
} from "./gacha.models";

export interface GachaRepository {
    getWallet(playerId: number): GachaPlayerWallet | null;
    setWallet(playerId: number, wallet: GachaPlayerWallet): void;

    getItemAmount(playerId: number, itemId: number): number | null;
    setItemAmount(playerId: number, itemId: number, amount: number): void;

    findGachaInfo(playerId: number, gachaId: number): PlayerGachaInfoState | null;
    upsertGachaInfo(playerId: number, info: PlayerGachaInfoState): void;

    findCampaign(
        playerId: number,
        gachaId: number,
        campaignId: number,
    ): PlayerGachaCampaignState | null;
    upsertCampaign(playerId: number, campaign: PlayerGachaCampaignState): void;

    transaction<T>(work: () => T): T;
}
