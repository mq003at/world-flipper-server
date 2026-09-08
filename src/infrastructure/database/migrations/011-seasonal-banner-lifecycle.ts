import type { Database as BetterSqlite3Database } from "better-sqlite3";

export const seasonalBannerLifecycleMigration = {
    version: 11,
    name: "seasonal-banner-lifecycle-v2",
    up(database: BetterSqlite3Database): void {
        database.exec(`
            CREATE TABLE runtime_gacha_banners_v1_backup AS
            SELECT * FROM runtime_gacha_banners;

            CREATE TABLE admin_gacha_overrides_v1_backup AS
            SELECT * FROM admin_gacha_overrides;

            DELETE FROM admin_gacha_overrides;
            DELETE FROM runtime_gacha_banners;
            DELETE FROM released_gacha_content;
            DELETE FROM seasonal_gacha_feature_history;
            DELETE FROM player_gacha_daily_entitlements;

            CREATE TABLE season_unit_release (
                season_number INTEGER NOT NULL,
                content_type TEXT NOT NULL,
                unit_id INTEGER NOT NULL,
                released_at TEXT NOT NULL,
                source_banner_type TEXT NOT NULL,
                source_banner_run_id TEXT NOT NULL,
                PRIMARY KEY (season_number, content_type, unit_id)
            );

            CREATE INDEX idx_season_unit_release_pool
            ON season_unit_release(season_number, content_type, released_at, unit_id);

            CREATE TABLE seasonal_gacha_feature_history_v2 (
                season_number INTEGER NOT NULL,
                content_type TEXT NOT NULL,
                content_id INTEGER NOT NULL,
                slot_type TEXT NOT NULL,
                cycle_index INTEGER NOT NULL,
                featured_at TEXT NOT NULL,
                PRIMARY KEY (season_number, content_type, content_id, slot_type, cycle_index)
            );

            CREATE INDEX idx_seasonal_gacha_feature_history_v2_lookup
            ON seasonal_gacha_feature_history_v2(season_number, content_type, slot_type, cycle_index);

            CREATE TABLE player_season_gacha_entitlements (
                player_id INTEGER NOT NULL,
                season_number INTEGER NOT NULL,
                base_first_multi_consumed_at TEXT,
                base_selector_consumed_at TEXT,
                base_selector_character_id INTEGER,
                PRIMARY KEY (player_id, season_number),
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE TABLE player_banner_daily_entitlements (
                player_id INTEGER NOT NULL,
                banner_run_id TEXT NOT NULL,
                calendar_date TEXT NOT NULL,
                consumed_at TEXT,
                PRIMARY KEY (player_id, banner_run_id, calendar_date),
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE TABLE player_season_state (
                player_id INTEGER PRIMARY KEY,
                season_number INTEGER NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );
        `);
    },
};
