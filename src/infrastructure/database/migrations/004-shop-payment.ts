import type { Database as BetterSqlite3Database } from "better-sqlite3";

export const shopPaymentMigration = {
    version: 4,
    name: "shop-payment",
    up(database: BetterSqlite3Database): void {
        database.exec(`
            CREATE TABLE player_shop_purchases (
                player_id INTEGER NOT NULL,
                shop_type INTEGER NOT NULL,
                shop_item_id INTEGER NOT NULL,
                today_purchase_num INTEGER NOT NULL,
                today_period_key TEXT NOT NULL,
                this_month_purchase_num INTEGER NOT NULL,
                month_period_key TEXT NOT NULL,
                total_purchase_num INTEGER NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (player_id, shop_type, shop_item_id),
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE TABLE player_payment_grants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                product_id TEXT NOT NULL,
                paid_vmoney INTEGER NOT NULL,
                transaction_id TEXT UNIQUE,
                created_at TEXT NOT NULL,
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_player_payment_grants_player_id
                ON player_payment_grants(player_id);
        `);
    },
};
