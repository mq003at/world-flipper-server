import type { Database as BetterSqlite3Database } from "better-sqlite3";

export const seasonalGachaMigration = {
    version: 9,
    name: "seasonal-gacha-runtime",
    up(database: BetterSqlite3Database): void {
        database.exec(`
            CREATE TABLE runtime_gacha_banners (
                season_number INTEGER NOT NULL,
                cycle_index INTEGER NOT NULL,
                slot_type TEXT NOT NULL,
                shell_gacha_id INTEGER NOT NULL,
                featured_ids_json TEXT NOT NULL,
                festival INTEGER NOT NULL,
                starts_at TEXT NOT NULL,
                ends_at TEXT NOT NULL,
                definition_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (season_number, cycle_index, slot_type)
            );

            CREATE INDEX idx_runtime_gacha_shell_window
            ON runtime_gacha_banners(shell_gacha_id, starts_at, ends_at);

            CREATE TABLE released_gacha_content (
                content_type TEXT NOT NULL,
                content_id INTEGER NOT NULL,
                released_season INTEGER NOT NULL,
                released_cycle INTEGER NOT NULL,
                released_at TEXT NOT NULL,
                PRIMARY KEY (content_type, content_id)
            );

            CREATE TABLE seasonal_gacha_feature_history (
                content_type TEXT NOT NULL,
                content_id INTEGER NOT NULL,
                slot_type TEXT NOT NULL,
                global_cycle INTEGER NOT NULL,
                featured_at TEXT NOT NULL,
                PRIMARY KEY (content_type, content_id, slot_type, global_cycle)
            );

            CREATE TABLE player_gacha_daily_entitlements (
                player_id INTEGER NOT NULL,
                campaign_day TEXT NOT NULL,
                consumed_at TEXT,
                PRIMARY KEY (player_id, campaign_day),
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );
        `);
    },
};
