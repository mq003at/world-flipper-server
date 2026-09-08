import type { DatabaseConnection } from "../../infrastructure/database/database";
import type { Clock } from "../../infrastructure/clock/clock";
import type { SeasonalGachaCalendar } from "./seasonal-gacha-calendar";

export interface SeasonRolloverCoordinator {
    ensureCurrent(playerId: number, now?: Date): boolean;
}

/** Player-scoped destructive part of the six-month season boundary. */
export class SqliteSeasonRolloverService implements SeasonRolloverCoordinator {
    constructor(
        private readonly database: DatabaseConnection,
        private readonly calendar: SeasonalGachaCalendar,
        private readonly clock: Clock,
    ) {}

    ensureCurrent(playerId: number, now = this.clock.now()): boolean {
        const seasonNumber = this.calendar.position(now).seasonNumber;
        const existing = this.database.prepare("SELECT season_number FROM player_season_state WHERE player_id = ?")
            .get(playerId) as { season_number: number } | undefined;
        if (!existing) {
            this.upsert(playerId, seasonNumber, now);
            return false;
        }
        if (existing.season_number === seasonNumber) return false;

        this.database.transaction(() => {
            // Children cascade from players_characters, preserving equipment.
            this.database.prepare("DELETE FROM players_characters WHERE player_id = ?").run(playerId);
            this.database.prepare(`UPDATE players_parties SET
                character_id_1 = 1, character_id_2 = NULL, character_id_3 = NULL,
                unison_character_1 = NULL, unison_character_2 = NULL, unison_character_3 = NULL
                WHERE player_id = ?`).run(playerId);
            this.database.prepare("UPDATE players SET leader_character_id = 1 WHERE id = ?").run(playerId);
            this.database.prepare(`INSERT INTO players_characters (
                id, entry_count, evolution_level, over_limit_step, protection,
                join_time, update_time, exp, stack, mana_board_index, player_id,
                ex_boost_status_id, ex_boost_ability_id_list, illustration_settings
            ) VALUES (1, 1, 0, 0, 0, ?, ?, 10, 0, 1, ?, NULL, NULL, NULL)`)
                .run(now.toISOString(), now.toISOString(), playerId);
            const bond = this.database.prepare("INSERT INTO players_characters_bond_tokens (mana_board_index, status, player_id, character_id) VALUES (?, 0, ?, 1)");
            bond.run(1, playerId); bond.run(2, playerId);

            for (const table of [
                "players_gacha_info", "players_gacha_campaigns", "player_gacha_daily_entitlements",
                "player_banner_daily_entitlements", "live_mission_progress", "players_active_missions",
                "players_box_gacha", "players_box_gacha_drawn_rewards", "player_event_state",
                "players_rush_events", "player_ranking_event_rewards", "player_active_quests",
            ]) {
                this.database.prepare(`DELETE FROM ${table} WHERE player_id = ?`).run(playerId);
            }
            this.upsert(playerId, seasonNumber, now);
        })();
        return true;
    }

    private upsert(playerId: number, seasonNumber: number, now: Date): void {
        this.database.prepare(`INSERT INTO player_season_state (player_id, season_number, updated_at)
            VALUES (?, ?, ?) ON CONFLICT(player_id) DO UPDATE SET
            season_number = excluded.season_number, updated_at = excluded.updated_at`)
            .run(playerId, seasonNumber, now.toISOString());
    }
}
