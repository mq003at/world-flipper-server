import type { Database as BetterSqlite3Database } from "better-sqlite3";

export const adminGachaMigration = {
    version: 10,
    name: "admin-gacha-overrides",
    up(database: BetterSqlite3Database): void {
        database.exec(`
            CREATE TABLE admin_gacha_overrides (
                season_number INTEGER NOT NULL,
                cycle_index INTEGER NOT NULL,
                slot_type TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                artwork_path TEXT,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (season_number, cycle_index, slot_type)
            );

            CREATE INDEX idx_admin_gacha_overrides_enabled
            ON admin_gacha_overrides(season_number, cycle_index, enabled);
        `);
    },
};
