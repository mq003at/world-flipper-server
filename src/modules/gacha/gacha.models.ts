import type { GachaDefinition } from "../../content/master-data/gacha-catalog";
import type { GrantedCharacter, GrantedEquipment } from "../reward/reward.models";

export enum GachaPaymentType {
    EMPTY = 0,
    FREE_VMONEY = 1,
    VMONEY = 2,
    TICKET = 3,
    CAMPAIGN = 4,
}

export enum GachaExecType {
    EMPTY = 0,
    VMONEY_SINGLE = 1,
    VMONEY_MULTI = 2,
    UNKNOWN_1 = 3,
    UNKNOWN_2 = 4,
    DAILY_SINGLE = 5,
    UNKNOWN_3 = 6,
    CAMPAIGN_SINGLE = 7,
    CAMPAIGN_MULTI = 8,
    MULTI_TICKET = 9,
    SINGLE_TICKET = 10,
    UNKNOWN_4 = 11,
    UNKNOWN_5 = 12,
    MULTI_WEAPON_TICKET = 13,
}

export interface GachaPlayerWallet {
    freeVmoney: number;
    vmoney: number;
}

export interface PlayerGachaInfoState {
    gachaId: number;
    isDailyFirst: boolean;
    isAccountFirst: boolean;
    gachaExchangePoint: number;
}

export interface PlayerGachaCampaignState {
    gachaId: number;
    campaignId: number;
    count: number;
}

export interface CharacterDrawPresentation {
    characterId: number;
    movieId: string;
    seed: number;
    entryCount: number;
    exBoostItem?: { id: number; count: number };
}

export interface EquipmentDrawPresentation {
    equipmentId: number;
    treasureUpType: number;
}

export interface ExecuteGachaResult {
    viewerId: number;
    gacha: GachaDefinition;
    wallet: GachaPlayerWallet;
    characterDraws: CharacterDrawPresentation[];
    equipmentDraws: EquipmentDrawPresentation[];
    characters: GrantedCharacter[];
    equipment: GrantedEquipment[];
    /** Item values expected by the legacy response: ticket balance or draw-granted deltas. */
    items: Record<string, number>;
    gachaInfo: PlayerGachaInfoState;
    campaigns: PlayerGachaCampaignState[];
}

export interface ExchangeCharacterResult {
    viewerId: number;
    granted: GrantedCharacter;
    gachaInfo: PlayerGachaInfoState;
}

export interface ExchangeEquipmentResult {
    viewerId: number;
    granted: GrantedEquipment;
    gachaInfo: PlayerGachaInfoState;
}
