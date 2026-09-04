import type { Database as BetterSqlite3Database } from "better-sqlite3";

export const complexEventsLifecycleMigration = {
    version: 7,
    name: "complex-events-lifecycle",
    up(database: BetterSqlite3Database): void {
        database.exec(`
            CREATE TABLE player_lifecycle_state (
                player_id INTEGER PRIMARY KEY,
                daily_key TEXT NOT NULL,
                weekly_key TEXT NOT NULL,
                monthly_key TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE TABLE players_rush_events (
                player_id INTEGER NOT NULL,
                event_id INTEGER NOT NULL,
                active_folder_id INTEGER,
                endless_max_round INTEGER,
                endless_max_round_time INTEGER,
                endless_max_round_character_id_1 INTEGER,
                endless_max_round_character_id_2 INTEGER,
                endless_max_round_character_id_3 INTEGER,
                endless_max_round_evolution_level_1 INTEGER,
                endless_max_round_evolution_level_2 INTEGER,
                endless_max_round_evolution_level_3 INTEGER,
                PRIMARY KEY (player_id, event_id),
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_players_rush_events_ranking
            ON players_rush_events(event_id, endless_max_round DESC, endless_max_round_time ASC);

            CREATE TABLE players_rush_events_cleared_folders (
                player_id INTEGER NOT NULL,
                event_id INTEGER NOT NULL,
                folder_id INTEGER NOT NULL,
                PRIMARY KEY (player_id, event_id, folder_id),
                FOREIGN KEY (player_id, event_id)
                    REFERENCES players_rush_events(player_id, event_id)
                    ON DELETE CASCADE
            );

            CREATE TABLE players_rush_events_played_parties (
                player_id INTEGER NOT NULL,
                event_id INTEGER NOT NULL,
                round INTEGER NOT NULL,
                battle_type INTEGER NOT NULL,
                character_id_1 INTEGER,
                character_id_2 INTEGER,
                character_id_3 INTEGER,
                unison_character_id_1 INTEGER,
                unison_character_id_2 INTEGER,
                unison_character_id_3 INTEGER,
                equipment_id_1 INTEGER,
                equipment_id_2 INTEGER,
                equipment_id_3 INTEGER,
                ability_soul_id_1 INTEGER,
                ability_soul_id_2 INTEGER,
                ability_soul_id_3 INTEGER,
                evolution_img_level_1 INTEGER,
                evolution_img_level_2 INTEGER,
                evolution_img_level_3 INTEGER,
                unison_evolution_img_level_1 INTEGER,
                unison_evolution_img_level_2 INTEGER,
                unison_evolution_img_level_3 INTEGER,
                PRIMARY KEY (player_id, event_id, round, battle_type),
                FOREIGN KEY (player_id, event_id)
                    REFERENCES players_rush_events(player_id, event_id)
                    ON DELETE CASCADE
            );

            CREATE TABLE player_ranking_event_rewards (
                player_id INTEGER NOT NULL,
                event_id INTEGER NOT NULL,
                claimed_at TEXT NOT NULL,
                PRIMARY KEY (player_id, event_id),
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE TABLE raid_event_state (
                event_id INTEGER PRIMARY KEY,
                hp_percentage REAL NOT NULL,
                total_kill_count INTEGER NOT NULL
            );
        `);
    },
};
