import type { DatabaseConnection } from "../../../infrastructure/database/database";
import { PartyCategory, type PlayerParty, type PlayerPartyGroup } from "../../player/player.models";
import { RushEventBattleType, type RushEventState, type RushPlayedParty, type RushRankingEntry } from "./rush-event.models";
import type { RushEventRepository } from "./rush-event.repository";

type StateRow = {
    player_id: number; event_id: number; active_folder_id: number | null;
    endless_max_round: number | null; endless_max_round_time: number | null;
    char1: number | null; char2: number | null; char3: number | null;
    evo1: number | null; evo2: number | null; evo3: number | null;
};

type PartyRow = {
    player_id: number; event_id: number; round: number; battle_type: number;
    character_id_1: number | null; character_id_2: number | null; character_id_3: number | null;
    unison_character_id_1: number | null; unison_character_id_2: number | null; unison_character_id_3: number | null;
    equipment_id_1: number | null; equipment_id_2: number | null; equipment_id_3: number | null;
    ability_soul_id_1: number | null; ability_soul_id_2: number | null; ability_soul_id_3: number | null;
    evolution_img_level_1: number | null; evolution_img_level_2: number | null; evolution_img_level_3: number | null;
    unison_evolution_img_level_1: number | null; unison_evolution_img_level_2: number | null; unison_evolution_img_level_3: number | null;
};

function stateFromRow(row: StateRow): RushEventState {
    return {
        playerId: row.player_id,
        eventId: row.event_id,
        activeFolderId: row.active_folder_id,
        endlessMaxRound: row.endless_max_round,
        endlessMaxRoundTime: row.endless_max_round_time,
        endlessMaxRoundCharacterIds: [row.char1, row.char2, row.char3],
        endlessMaxRoundEvolutionLevels: [row.evo1, row.evo2, row.evo3],
    };
}

function partyFromRow(row: PartyRow): RushPlayedParty {
    return {
        playerId: row.player_id,
        eventId: row.event_id,
        round: row.round,
        battleType: row.battle_type as RushEventBattleType,
        characterIds: [row.character_id_1, row.character_id_2, row.character_id_3],
        unisonCharacterIds: [row.unison_character_id_1, row.unison_character_id_2, row.unison_character_id_3],
        equipmentIds: [row.equipment_id_1, row.equipment_id_2, row.equipment_id_3],
        abilitySoulIds: [row.ability_soul_id_1, row.ability_soul_id_2, row.ability_soul_id_3],
        evolutionLevels: [row.evolution_img_level_1, row.evolution_img_level_2, row.evolution_img_level_3],
        unisonEvolutionLevels: [row.unison_evolution_img_level_1, row.unison_evolution_img_level_2, row.unison_evolution_img_level_3],
    };
}

export class SqliteRushEventRepository implements RushEventRepository {
    constructor(private readonly database: DatabaseConnection) {}

    findState(playerId: number, eventId: number): RushEventState | null {
        const row = this.database.prepare(`
            SELECT player_id, event_id, active_folder_id, endless_max_round, endless_max_round_time,
                   endless_max_round_character_id_1 AS char1, endless_max_round_character_id_2 AS char2,
                   endless_max_round_character_id_3 AS char3, endless_max_round_evolution_level_1 AS evo1,
                   endless_max_round_evolution_level_2 AS evo2, endless_max_round_evolution_level_3 AS evo3
            FROM players_rush_events WHERE player_id = ? AND event_id = ?
        `).get(playerId, eventId) as StateRow | undefined;
        return row ? stateFromRow(row) : null;
    }

    createState(playerId: number, eventId: number): RushEventState {
        this.database.prepare(`
            INSERT OR IGNORE INTO players_rush_events (player_id, event_id) VALUES (?, ?)
        `).run(playerId, eventId);
        return this.findState(playerId, eventId) as RushEventState;
    }

    setActiveFolder(playerId: number, eventId: number, folderId: number | null): void {
        this.database.prepare(`UPDATE players_rush_events SET active_folder_id = ? WHERE player_id = ? AND event_id = ?`)
            .run(folderId, playerId, eventId);
    }

    updateEndlessBest(playerId: number, eventId: number, round: number, elapsedTimeMs: number, characterIds: Array<number | null>, evolutionLevels: Array<number | null>): void {
        this.database.prepare(`
            UPDATE players_rush_events SET endless_max_round = ?, endless_max_round_time = ?,
                endless_max_round_character_id_1 = ?, endless_max_round_character_id_2 = ?, endless_max_round_character_id_3 = ?,
                endless_max_round_evolution_level_1 = ?, endless_max_round_evolution_level_2 = ?, endless_max_round_evolution_level_3 = ?
            WHERE player_id = ? AND event_id = ?
        `).run(round, elapsedTimeMs, characterIds[0] ?? null, characterIds[1] ?? null, characterIds[2] ?? null,
            evolutionLevels[0] ?? null, evolutionLevels[1] ?? null, evolutionLevels[2] ?? null, playerId, eventId);
    }

    listClearedFolders(playerId: number, eventId: number): number[] {
        return (this.database.prepare(`SELECT folder_id FROM players_rush_events_cleared_folders WHERE player_id = ? AND event_id = ? ORDER BY folder_id`)
            .all(playerId, eventId) as Array<{ folder_id: number }>).map((row) => row.folder_id);
    }

    markFolderCleared(playerId: number, eventId: number, folderId: number): void {
        this.database.prepare(`INSERT OR IGNORE INTO players_rush_events_cleared_folders (player_id, event_id, folder_id) VALUES (?, ?, ?)`)
            .run(playerId, eventId, folderId);
    }

    listPlayedParties(playerId: number, eventId: number): RushPlayedParty[] {
        const rows = this.database.prepare(`SELECT * FROM players_rush_events_played_parties WHERE player_id = ? AND event_id = ? ORDER BY battle_type, round`)
            .all(playerId, eventId) as PartyRow[];
        return rows.map(partyFromRow);
    }

    insertPlayedParty(party: RushPlayedParty): void {
        this.database.prepare(`
            INSERT INTO players_rush_events_played_parties (
                player_id, event_id, round, battle_type,
                character_id_1, character_id_2, character_id_3,
                unison_character_id_1, unison_character_id_2, unison_character_id_3,
                equipment_id_1, equipment_id_2, equipment_id_3,
                ability_soul_id_1, ability_soul_id_2, ability_soul_id_3,
                evolution_img_level_1, evolution_img_level_2, evolution_img_level_3,
                unison_evolution_img_level_1, unison_evolution_img_level_2, unison_evolution_img_level_3
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(player_id, event_id, round, battle_type) DO UPDATE SET
                character_id_1=excluded.character_id_1, character_id_2=excluded.character_id_2, character_id_3=excluded.character_id_3,
                unison_character_id_1=excluded.unison_character_id_1, unison_character_id_2=excluded.unison_character_id_2, unison_character_id_3=excluded.unison_character_id_3,
                equipment_id_1=excluded.equipment_id_1, equipment_id_2=excluded.equipment_id_2, equipment_id_3=excluded.equipment_id_3,
                ability_soul_id_1=excluded.ability_soul_id_1, ability_soul_id_2=excluded.ability_soul_id_2, ability_soul_id_3=excluded.ability_soul_id_3,
                evolution_img_level_1=excluded.evolution_img_level_1, evolution_img_level_2=excluded.evolution_img_level_2, evolution_img_level_3=excluded.evolution_img_level_3,
                unison_evolution_img_level_1=excluded.unison_evolution_img_level_1, unison_evolution_img_level_2=excluded.unison_evolution_img_level_2, unison_evolution_img_level_3=excluded.unison_evolution_img_level_3
        `).run(
            party.playerId, party.eventId, party.round, party.battleType,
            ...party.characterIds.slice(0,3), ...party.unisonCharacterIds.slice(0,3), ...party.equipmentIds.slice(0,3),
            ...party.abilitySoulIds.slice(0,3), ...party.evolutionLevels.slice(0,3), ...party.unisonEvolutionLevels.slice(0,3),
        );
    }

    deletePlayedParties(playerId: number, eventId: number, battleType: RushEventBattleType): void {
        this.database.prepare(`DELETE FROM players_rush_events_played_parties WHERE player_id = ? AND event_id = ? AND battle_type = ?`).run(playerId, eventId, battleType);
    }
    deletePlayedParty(playerId: number, eventId: number, battleType: RushEventBattleType, round: number): void {
        this.database.prepare(`DELETE FROM players_rush_events_played_parties WHERE player_id = ? AND event_id = ? AND battle_type = ? AND round = ?`).run(playerId, eventId, battleType, round);
    }
    deletePlayedPartiesFrom(playerId: number, eventId: number, battleType: RushEventBattleType, round: number): void {
        this.database.prepare(`DELETE FROM players_rush_events_played_parties WHERE player_id = ? AND event_id = ? AND battle_type = ? AND round >= ?`).run(playerId, eventId, battleType, round);
    }

    nextEndlessRound(playerId: number, eventId: number): number {
        const rounds = (this.database.prepare(`SELECT round FROM players_rush_events_played_parties WHERE player_id = ? AND event_id = ? AND battle_type = ? ORDER BY round`)
            .all(playerId, eventId, RushEventBattleType.ENDLESS) as Array<{ round: number }>).map((row) => row.round);
        let next = 1;
        for (const round of rounds) { if (round !== next) break; next += 1; }
        return next;
    }

    rankingForPlayer(playerId: number, eventId: number): RushRankingEntry | null {
        const row = this.database.prepare(`
            SELECT r.player_id, r.event_id, r.active_folder_id, r.endless_max_round, r.endless_max_round_time,
                   r.endless_max_round_character_id_1 AS char1, r.endless_max_round_character_id_2 AS char2,
                   r.endless_max_round_character_id_3 AS char3, r.endless_max_round_evolution_level_1 AS evo1,
                   r.endless_max_round_evolution_level_2 AS evo2, r.endless_max_round_evolution_level_3 AS evo3,
                   p.name
            FROM players_rush_events r JOIN players p ON p.id = r.player_id
            WHERE r.player_id = ? AND r.event_id = ?
        `).get(playerId, eventId) as (StateRow & { name: string }) | undefined;
        if (!row || row.endless_max_round === null || row.endless_max_round_time === null) return null;
        const rankRow = this.database.prepare(`
            SELECT COUNT(*) + 1 AS rank FROM players_rush_events
            WHERE event_id = ? AND (
                COALESCE(endless_max_round, -1) > ? OR
                (endless_max_round = ? AND COALESCE(endless_max_round_time, 9223372036854775807) < ?)
            )
        `).get(eventId, row.endless_max_round, row.endless_max_round, row.endless_max_round_time) as { rank: number };
        return {
            rankNumber: rankRow.rank,
            bestRound: row.endless_max_round,
            elapsedTimeMs: row.endless_max_round_time,
            name: row.name,
            partyMembers: [row.char1, row.char2, row.char3].flatMap((id, i) => id === null ? [] : [{ characterId: id, evolutionImgLevel: [row.evo1,row.evo2,row.evo3][i] ?? 0 }]),
            userRank: 215,
        };
    }

    rankingPage(eventId: number, page: number, pageSize = 100): { pageMax: number; list: RushRankingEntry[] } {
        const count = (this.database.prepare(`SELECT COUNT(*) AS n FROM players_rush_events WHERE event_id = ? AND endless_max_round IS NOT NULL`).get(eventId) as { n: number }).n;
        const rows = this.database.prepare(`
            SELECT player_id FROM players_rush_events WHERE event_id = ? AND endless_max_round IS NOT NULL
            ORDER BY endless_max_round DESC, endless_max_round_time ASC LIMIT ? OFFSET ?
        `).all(eventId, pageSize, Math.max(0,page)*pageSize) as Array<{ player_id: number }>;
        const list = rows.flatMap((row) => { const entry = this.rankingForPlayer(row.player_id, eventId); return entry ? [entry] : []; });
        return { pageMax: Math.ceil(count / pageSize), list };
    }

    playerIdAtRank(eventId: number, rank: number): number | null {
        const row = this.database.prepare(`SELECT player_id FROM players_rush_events WHERE event_id = ? AND endless_max_round IS NOT NULL ORDER BY endless_max_round DESC, endless_max_round_time ASC LIMIT 1 OFFSET ?`)
            .get(eventId, Math.max(0, rank - 1)) as { player_id: number } | undefined;
        return row?.player_id ?? null;
    }

    getCharacterEvolutionLevels(playerId: number, characterIds: Array<number | null>): Array<number | null> {
        const stmt = this.database.prepare(`SELECT evolution_level FROM players_characters WHERE player_id = ? AND id = ?`);
        return characterIds.map((id) => id === null ? null : ((stmt.get(playerId, id) as { evolution_level: number } | undefined)?.evolution_level ?? 0));
    }

    loadPartyGroups(playerId: number, category: number): Record<string, PlayerPartyGroup> {
        const groups = this.database.prepare(`SELECT id, color_id FROM players_party_groups WHERE player_id = ? AND category = ? ORDER BY id`).all(playerId, category) as Array<{ id:number;color_id:number }>;
        const result: Record<string, PlayerPartyGroup> = {};
        const parties = this.database.prepare(`SELECT * FROM players_parties WHERE player_id = ? AND category = ? ORDER BY group_id, slot`).all(playerId, category) as Array<Record<string, number|string|null>>;
        for (const group of groups) result[String(group.id)] = { colorId: group.color_id, category: category as PartyCategory, list: {} };
        for (const row of parties) {
            const gid = String(row.group_id);
            const group = result[gid]; if (!group) continue;
            const party: PlayerParty = {
                name: String(row.name),
                characterIds: [row.character_id_1,row.character_id_2,row.character_id_3] as Array<number|null>,
                unisonCharacterIds: [row.unison_character_1,row.unison_character_2,row.unison_character_3] as Array<number|null>,
                equipmentIds: [row.equipment_1,row.equipment_2,row.equipment_3] as Array<number|null>,
                abilitySoulIds: [row.ability_soul_1,row.ability_soul_2,row.ability_soul_3] as Array<number|null>,
                edited: Number(row.edited) === 1,
                allowOtherPlayersToHealMe: false,
                category: category as PartyCategory,
            };
            group.list[String(row.slot)] = party;
        }
        return result;
    }

    ensureEventPartyGroups(playerId: number): Record<string, PlayerPartyGroup> {
        let eventGroups = this.loadPartyGroups(playerId, PartyCategory.EVENT);
        if (Object.keys(eventGroups).length > 0) return eventGroups;
        const normal = this.loadPartyGroups(playerId, PartyCategory.NORMAL);
        const insertGroup = this.database.prepare(`INSERT OR IGNORE INTO players_party_groups (id,color_id,player_id,category) VALUES (?,?,?,?)`);
        const insertParty = this.database.prepare(`
            INSERT OR IGNORE INTO players_parties (slot,name,character_id_1,character_id_2,character_id_3,unison_character_1,unison_character_2,unison_character_3,equipment_1,equipment_2,equipment_3,ability_soul_1,ability_soul_2,ability_soul_3,edited,player_id,group_id,category)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `);
        for (const [gid, group] of Object.entries(normal)) {
            insertGroup.run(Number(gid), group.colorId, playerId, PartyCategory.EVENT);
            for (const [slot, p] of Object.entries(group.list)) {
                insertParty.run(Number(slot), p.name, ...p.characterIds, ...p.unisonCharacterIds, ...p.equipmentIds, ...p.abilitySoulIds, p.edited?1:0, playerId, Number(gid), PartyCategory.EVENT);
            }
        }
        eventGroups = this.loadPartyGroups(playerId, PartyCategory.EVENT);
        return eventGroups;
    }

    transaction<T>(work: () => T): T { return this.database.transaction(work)(); }
}
