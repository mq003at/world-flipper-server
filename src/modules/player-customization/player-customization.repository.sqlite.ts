import type { DatabaseConnection } from "../../infrastructure/database/database";
import type { PartyEditItem } from "./player-customization.contracts";
import type { PlayerCustomizationRepository } from "./player-customization.repository";

function toDbBoolean(value: boolean): number {
    return value ? 1 : 0;
}

export class SqlitePlayerCustomizationRepository implements PlayerCustomizationRepository {
    constructor(private readonly database: DatabaseConnection) {}

    updateOptions(playerId: number, options: Record<string, boolean>): void {
        const upsert = this.database.prepare(`
            INSERT INTO players_options (key, value, player_id)
            VALUES (?, ?, ?)
            ON CONFLICT(key, player_id) DO UPDATE SET value = excluded.value
        `);
        for (const [key, value] of Object.entries(options)) {
            upsert.run(key, toDbBoolean(value), playerId);
        }
    }

    updateMainParty(playerId: number, mainPartyId: number): void {
        this.database
            .prepare("UPDATE players SET party_slot = ? WHERE id = ?")
            .run(mainPartyId, playerId);
    }

    ownsCharacter(playerId: number, characterId: number): boolean {
        return this.database
            .prepare("SELECT 1 FROM players_characters WHERE player_id = ? AND id = ?")
            .get(playerId, characterId) !== undefined;
    }

    ownsEquipment(playerId: number, equipmentId: number): boolean {
        return this.database
            .prepare("SELECT 1 FROM players_equipment WHERE player_id = ? AND id = ?")
            .get(playerId, equipmentId) !== undefined;
    }

    updateParty(playerId: number, party: PartyEditItem): void {
        this.database.prepare(`
            UPDATE players_parties
            SET name = ?,
                character_id_1 = ?, character_id_2 = ?, character_id_3 = ?,
                unison_character_1 = ?, unison_character_2 = ?, unison_character_3 = ?,
                equipment_1 = ?, equipment_2 = ?, equipment_3 = ?,
                ability_soul_1 = ?, ability_soul_2 = ?, ability_soul_3 = ?,
                edited = ?
            WHERE slot = ? AND player_id = ? AND category = ?
        `).run(
            party.partyName,
            ...party.characterIds,
            ...party.unisonCharacterIds,
            ...party.equipmentIds,
            ...party.abilitySoulIds,
            toDbBoolean(party.partyEdited),
            party.partyId,
            playerId,
            party.partyCategory,
        );
    }

    updatePartyGroup(
        playerId: number,
        partyGroupId: number,
        partyCategory: number,
        colorId: number,
    ): void {
        this.database.prepare(`
            UPDATE players_party_groups
            SET color_id = ?
            WHERE id = ? AND player_id = ? AND category = ?
        `).run(colorId, partyGroupId, playerId, partyCategory);
    }

    transaction<T>(work: () => T): T {
        return this.database.transaction(work)();
    }
}
