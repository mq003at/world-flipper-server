import BetterSqlite3, { type Database as BetterSqlite3Database } from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { identityMigration } from "./migrations/001-identity";
import { playerBootstrapMigration } from "./migrations/002-player-bootstrap";

export type DatabaseConnection = BetterSqlite3Database;

interface Migration {
    version: number;
    name: string;
    up(database: DatabaseConnection): void;
}

const migrations: Migration[] = [identityMigration, playerBootstrapMigration];

function ensureParentDirectory(databasePath: string): void {
    if (databasePath === ":memory:") return;
    mkdirSync(path.dirname(databasePath), { recursive: true });
}

function migrate(database: DatabaseConnection): void {
    database.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        );
    `);

    const applied = new Set(
        (
            database
                .prepare("SELECT version FROM schema_migrations")
                .all() as Array<{ version: number }>
        ).map((row) => row.version),
    );

    const applyMigration = database.transaction((migration: Migration) => {
        migration.up(database);
        database
            .prepare(
                `INSERT INTO schema_migrations (version, name, applied_at)
                 VALUES (?, ?, ?)`,
            )
            .run(migration.version, migration.name, new Date().toISOString());
    });

    for (const migration of migrations) {
        if (!applied.has(migration.version)) applyMigration(migration);
    }
}

export function createDatabase(databasePath: string): DatabaseConnection {
    ensureParentDirectory(databasePath);

    const database = new BetterSqlite3(databasePath);
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
    database.pragma("busy_timeout = 5000");

    migrate(database);
    return database;
}
