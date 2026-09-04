import type { Database as BetterSqlite3Database } from "better-sqlite3";

export const liveServiceMigration = {
    version: 5,
    name: "live-service-foundation",
    up(database: BetterSqlite3Database): void {
        database.exec(`
            CREATE TABLE live_mission_progress (
                player_id INTEGER NOT NULL,
                mission_id INTEGER NOT NULL,
                period_key TEXT NOT NULL,
                progress INTEGER NOT NULL,
                completed_at TEXT,
                claimed_at TEXT,
                last_event_key TEXT,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (player_id, mission_id, period_key),
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_live_mission_progress_player_period
            ON live_mission_progress(player_id, period_key);
        `);
    },
};
