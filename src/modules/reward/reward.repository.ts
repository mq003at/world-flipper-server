import type { PlayerCharacter, PlayerEquipment } from "../player/player.models";
import type { PlayerWallet } from "./reward.models";

export interface RewardRepository {
    getWallet(playerId: number): PlayerWallet | null;
    setWallet(playerId: number, wallet: PlayerWallet): void;

    getItemAmount(playerId: number, itemId: number): number | null;
    setItemAmount(playerId: number, itemId: number, amount: number): void;

    getEquipment(playerId: number, equipmentId: number): PlayerEquipment | null;
    insertEquipment(playerId: number, equipmentId: number, equipment: PlayerEquipment): void;
    updateEquipmentStack(playerId: number, equipmentId: number, stack: number): void;

    getCharacter(playerId: number, characterId: number): PlayerCharacter | null;
    insertCharacter(playerId: number, characterId: number, character: PlayerCharacter): void;
    updateCharacterStack(
        playerId: number,
        characterId: number,
        stack: number,
        updateTime: Date,
    ): void;

    transaction<T>(work: () => T): T;
}
