import type { DatabaseConnection } from "../../infrastructure/database/database";
import { InvalidRequestError, InvariantError } from "../../shared/errors/application-error";
import type {
    PlayerImportSummary,
    PlayerSaveState,
    PortableRow,
    PortableScalar,
} from "./player-save.models";
import { PORTABLE_PLAYER_TABLES, type PortableTableSpec } from "./player-save.registry";
import type { PlayerDataRepository } from "./player-data.repository";

interface TableColumn {
    name: string;
    pk: number;
}

function quoteIdentifier(value: string): string {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
        throw new InvariantError(`Unsafe SQL identifier: ${value}`);
    }
    return `"${value}"`;
}

function toPortableScalar(value: unknown, context: string): PortableScalar {
    if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number"
    ) {
        return value;
    }
    throw new InvariantError(`Unsupported database value in ${context}.`);
}

function toPortableRow(
    row: Record<string, unknown>,
    omitted: ReadonlySet<string>,
    context: string,
): PortableRow {
    const result: PortableRow = {};
    for (const [key, value] of Object.entries(row)) {
        if (omitted.has(key)) continue;
        result[key] = toPortableScalar(value, `${context}.${key}`);
    }
    return result;
}

export class SqlitePlayerDataRepository implements PlayerDataRepository {
    private readonly columnsCache = new Map<string, TableColumn[]>();

    constructor(private readonly database: DatabaseConnection) {}

    findPlayerIdByViewerId(viewerId: number): number | null {
        const row = this.database
            .prepare(`
                SELECT p.id AS player_id
                FROM sessions s
                INNER JOIN players p ON p.account_id = s.account_id
                WHERE s.token = ? AND s.type = 2
                LIMIT 1
            `)
            .get(String(viewerId)) as { player_id: number } | undefined;
        return row?.player_id ?? null;
    }

    playerExists(playerId: number): boolean {
        return this.database.prepare("SELECT 1 FROM players WHERE id = ?").get(playerId) !== undefined;
    }

    exportState(playerId: number): PlayerSaveState {
        const playerRow = this.database.prepare("SELECT * FROM players WHERE id = ?").get(playerId) as
            | Record<string, unknown>
            | undefined;
        if (!playerRow) throw new InvalidRequestError("Player does not exist.");

        const player = toPortableRow(
            playerRow,
            new Set(["id", "account_id"]),
            "players",
        );

        const state: Record<string, PortableRow[]> = {};
        for (const spec of PORTABLE_PLAYER_TABLES) {
            state[spec.key] = this.exportSection(spec, playerId);
        }

        const schemaVersionRow = this.database
            .prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations")
            .get() as { version: number };

        return {
            schemaVersion: schemaVersionRow.version,
            player,
            state,
        };
    }

    replaceState(playerId: number, save: PlayerSaveState): PlayerImportSummary {
        if (!this.playerExists(playerId)) throw new InvalidRequestError("Player does not exist.");

        return this.database.transaction(() => {
            this.validatePlayerColumns(save.player);
            this.validateSections(save.state);

            for (const spec of [...PORTABLE_PLAYER_TABLES].reverse()) {
                this.database
                    .prepare(`DELETE FROM ${quoteIdentifier(spec.table)} WHERE player_id = ?`)
                    .run(playerId);
            }

            this.updatePlayer(playerId, save.player);

            let importedRows = 0;
            for (const spec of PORTABLE_PLAYER_TABLES) {
                const rows = save.state[spec.key] ?? [];
                for (const row of rows) {
                    this.insertSectionRow(spec, playerId, row);
                    importedRows += 1;
                }
            }

            return {
                playerId,
                importedSections: PORTABLE_PLAYER_TABLES.length,
                importedRows,
                replaced: true as const,
            };
        })();
    }

    private exportSection(spec: PortableTableSpec, playerId: number): PortableRow[] {
        const columns = this.tableColumns(spec.table);
        const orderColumns = columns
            .filter((column) => column.pk > 0)
            .sort((left, right) => left.pk - right.pk)
            .map((column) => column.name);
        const orderBy = orderColumns.length > 0
            ? ` ORDER BY ${orderColumns.map(quoteIdentifier).join(", ")}`
            : "";

        const rows = this.database
            .prepare(`SELECT * FROM ${quoteIdentifier(spec.table)} WHERE player_id = ?${orderBy}`)
            .all(playerId) as Array<Record<string, unknown>>;
        const omitted = new Set(["player_id", ...(spec.omit ?? [])]);
        return rows.map((row) => toPortableRow(row, omitted, spec.table));
    }

    private validatePlayerColumns(player: PortableRow): void {
        const portableColumns = this.tableColumns("players")
            .map((column) => column.name)
            .filter((name) => name !== "id" && name !== "account_id");
        const allowed = new Set(portableColumns);

        for (const key of Object.keys(player)) {
            if (!allowed.has(key)) {
                throw new InvalidRequestError(`Unsupported player field: ${key}`);
            }
        }
        for (const required of portableColumns) {
            if (!(required in player)) {
                throw new InvalidRequestError(`Player save is missing field: ${required}`);
            }
        }
    }

    private validateSections(state: Record<string, PortableRow[]>): void {
        const specs = new Map(PORTABLE_PLAYER_TABLES.map((spec) => [spec.key, spec]));
        for (const key of Object.keys(state)) {
            if (!specs.has(key)) throw new InvalidRequestError(`Unsupported player-save section: ${key}`);
        }

        for (const spec of PORTABLE_PLAYER_TABLES) {
            const rows = state[spec.key];
            if (!Array.isArray(rows)) {
                throw new InvalidRequestError(`Player save is missing section: ${spec.key}`);
            }
            const omitted = new Set(["player_id", ...(spec.omit ?? [])]);
            const allowed = new Set(
                this.tableColumns(spec.table)
                    .map((column) => column.name)
                    .filter((name) => !omitted.has(name)),
            );
            for (const row of rows) {
                for (const key of Object.keys(row)) {
                    if (!allowed.has(key)) {
                        throw new InvalidRequestError(`Unsupported field ${spec.key}.${key}`);
                    }
                }
            }
        }
    }

    private updatePlayer(playerId: number, player: PortableRow): void {
        const columns = Object.keys(player);
        const assignments = columns.map((column) => `${quoteIdentifier(column)} = ?`).join(", ");
        this.database
            .prepare(`UPDATE players SET ${assignments} WHERE id = ?`)
            .run(...columns.map((column) => player[column]), playerId);
    }

    private insertSectionRow(spec: PortableTableSpec, playerId: number, row: PortableRow): void {
        const omitted = new Set(["player_id", ...(spec.omit ?? [])]);
        const tableColumns = this.tableColumns(spec.table)
            .map((column) => column.name)
            .filter((name) => !omitted.has(name));

        const missing = tableColumns.filter((column) => !(column in row));
        if (missing.length > 0) {
            throw new InvalidRequestError(
                `Player-save row ${spec.key} is missing field(s): ${missing.join(", ")}`,
            );
        }

        const columns = ["player_id", ...tableColumns];
        const values: PortableScalar[] = [playerId, ...tableColumns.map((column) => row[column])];
        const placeholders = columns.map(() => "?").join(", ");
        this.database
            .prepare(
                `INSERT INTO ${quoteIdentifier(spec.table)} ` +
                    `(${columns.map(quoteIdentifier).join(", ")}) VALUES (${placeholders})`,
            )
            .run(...values);
    }

    private tableColumns(table: string): TableColumn[] {
        const cached = this.columnsCache.get(table);
        if (cached) return cached;
        const columns = this.database
            .prepare(`PRAGMA table_info(${quoteIdentifier(table)})`)
            .all() as Array<{ name: string; pk: number }>;
        if (columns.length === 0) throw new InvariantError(`Missing database table: ${table}`);
        const mapped = columns.map((column) => ({ name: column.name, pk: column.pk }));
        this.columnsCache.set(table, mapped);
        return mapped;
    }
}
