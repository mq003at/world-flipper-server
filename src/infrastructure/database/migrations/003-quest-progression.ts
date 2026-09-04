import type { DatabaseConnection } from "../database";

export const questProgressionMigration = {
    version: 3,
    name: "quest-progression",
    up(database: DatabaseConnection): void {
        database.exec(`
            CREATE TABLE player_active_quests (
                player_id INTEGER PRIMARY KEY,
                quest_id INTEGER NOT NULL,
                category INTEGER NOT NULL,
                use_boss_boost_point INTEGER NOT NULL,
                use_boost_point INTEGER NOT NULL,
                is_auto_start_mode INTEGER NOT NULL,
                party_id INTEGER NOT NULL,
                play_id TEXT NOT NULL,
                started_at TEXT NOT NULL,
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );
        `);
    },
};
