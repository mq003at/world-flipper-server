import type { Database as BetterSqlite3Database } from "better-sqlite3";

export const tutorialIdempotencyMigration = {
    version: 8,
    name: "tutorial-idempotency",
    up(database: BetterSqlite3Database): void {
        database.exec(`
            CREATE TABLE tutorial_update_results (
                player_id INTEGER NOT NULL,
                completed_step INTEGER NOT NULL,
                result_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (player_id, completed_step),
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );
        `);
    },
};
