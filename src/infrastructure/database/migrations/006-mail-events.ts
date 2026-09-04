import type { Database as BetterSqlite3Database } from "better-sqlite3";

export const mailEventsMigration = {
    version: 6,
    name: "mail-events",
    up(database: BetterSqlite3Database): void {
        database.exec(`
            CREATE TABLE player_mail (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                source_key TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                rewards_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT,
                read_at TEXT,
                claimed_at TEXT,
                UNIQUE (player_id, source_key),
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_player_mail_inbox
            ON player_mail(player_id, created_at DESC);

            CREATE INDEX idx_player_mail_unread
            ON player_mail(player_id, read_at, expires_at);

            CREATE TABLE player_event_state (
                player_id INTEGER NOT NULL,
                event_key TEXT NOT NULL,
                joined_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                completed_at TEXT,
                payload_json TEXT NOT NULL DEFAULT '{}',
                PRIMARY KEY (player_id, event_key),
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_player_event_state_player
            ON player_event_state(player_id, last_seen_at DESC);

            CREATE TABLE players_box_gacha_drawn_rewards (
                id INTEGER NOT NULL,
                box_id INTEGER NOT NULL,
                gacha_id INTEGER NOT NULL,
                number INTEGER NOT NULL,
                player_id INTEGER NOT NULL,
                PRIMARY KEY (id, box_id, gacha_id, player_id),
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_players_box_gacha_drawn_rewards_box
            ON players_box_gacha_drawn_rewards(player_id, gacha_id, box_id);
        `);
    },
};
