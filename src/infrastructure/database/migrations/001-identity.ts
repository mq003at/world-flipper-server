import type { Database as BetterSqlite3Database } from "better-sqlite3";

export const identityMigration = {
    version: 1,
    name: "identity",
    up(database: BetterSqlite3Database): void {
        database.exec(`
            CREATE TABLE accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_id TEXT NOT NULL,
                first_login_time TEXT NOT NULL,
                idp_alias TEXT NOT NULL,
                idp_code TEXT NOT NULL,
                idp_id TEXT NOT NULL UNIQUE,
                reg_time TEXT NOT NULL,
                last_login_time TEXT NOT NULL,
                status TEXT NOT NULL
            );

            CREATE INDEX idx_accounts_idp_id
                ON accounts(idp_id);

            CREATE TABLE sessions (
                token TEXT PRIMARY KEY,
                account_id INTEGER NOT NULL,
                expires TEXT NOT NULL,
                type INTEGER NOT NULL,
                FOREIGN KEY (account_id)
                    REFERENCES accounts(id)
                    ON DELETE CASCADE
            );

            CREATE INDEX idx_sessions_account_type
                ON sessions(account_id, type);
        `);
    },
};
