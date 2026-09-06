import type { PartyEditItem } from "./player-customization.contracts";

export interface PlayerCustomizationRepository {
    updateOptions(playerId: number, options: Record<string, boolean>): void;
    updateMainParty(playerId: number, mainPartyId: number): void;
    ownsCharacter(playerId: number, characterId: number): boolean;
    ownsEquipment(playerId: number, equipmentId: number): boolean;
    updateParty(playerId: number, party: PartyEditItem): void;
    updatePartyGroup(
        playerId: number,
        partyGroupId: number,
        partyCategory: number,
        colorId: number,
    ): void;
    transaction<T>(work: () => T): T;
}
