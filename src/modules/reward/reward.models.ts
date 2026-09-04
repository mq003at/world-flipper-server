import type { PlayerCharacter, PlayerEquipment } from "../player/player.models";

// Numeric values intentionally match the legacy World Flipper master-data contract.
export enum RewardType {
    ITEM = 0,
    EQUIPMENT = 1,
    CHARACTER = 2,
    BEADS = 3,
    MANA = 4,
    EXP = 5,
}

export interface ItemReward {
    type: RewardType.ITEM;
    id: number;
    count: number;
}

export interface EquipmentReward {
    type: RewardType.EQUIPMENT;
    id: number;
    count: number;
}

export interface CharacterReward {
    type: RewardType.CHARACTER;
    id: number;
}

export interface CurrencyReward {
    type: RewardType.BEADS | RewardType.MANA | RewardType.EXP;
    count: number;
}

export type Reward = ItemReward | EquipmentReward | CharacterReward | CurrencyReward;

export interface PlayerWallet {
    freeVmoney: number;
    freeMana: number;
    expPool: number;
}

export interface GrantedCharacter {
    characterId: number;
    character: PlayerCharacter;
    isNew: boolean;
    duplicateItem?: {
        id: number;
        count: number;
        total: number;
    };
}

export interface GrantedEquipment {
    equipmentId: number;
    equipment: PlayerEquipment;
    isNew: boolean;
}

export interface RewardGrantResult {
    walletBefore: PlayerWallet;
    walletAfter: PlayerWallet;
    deltas: {
        freeVmoney: number;
        freeMana: number;
        expPool: number;
    };
    characters: GrantedCharacter[];
    equipment: GrantedEquipment[];
    /** Final player-owned amount for every item touched by this grant. */
    items: Record<string, number>;
}
