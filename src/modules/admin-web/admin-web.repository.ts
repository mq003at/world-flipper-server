import type { DatabaseConnection } from "../../infrastructure/database/database";

export interface AdminPlayerSummary {
    id: number;
    name: string;
    comment: string;
    lastLoginTime: Date;
    paidVmoney: number;
    freeVmoney: number;
}

interface PlayerRow {
    id: number;
    name: string;
    comment: string;
    last_login_time: string;
    vmoney: number;
    free_vmoney: number;
}

function mapPlayer(row: PlayerRow): AdminPlayerSummary {
    return {
        id: row.id,
        name: row.name,
        comment: row.comment,
        lastLoginTime: new Date(row.last_login_time),
        paidVmoney: row.vmoney,
        freeVmoney: row.free_vmoney,
    };
}

export type BeadCurrency = "paid" | "free";
export type BeadOperation = "set" | "add";

const MAX_BEADS = 999_999_999;

export class AdminWebRepository {
    constructor(private readonly database: DatabaseConnection) {}

    listPlayers(): AdminPlayerSummary[] {
        return (this.database.prepare(`
            SELECT id, name, comment, last_login_time, vmoney, free_vmoney
            FROM players ORDER BY last_login_time DESC, id ASC
        `).all() as PlayerRow[]).map(mapPlayer);
    }

    findPlayer(id: number): AdminPlayerSummary | null {
        const row = this.database.prepare(`
            SELECT id, name, comment, last_login_time, vmoney, free_vmoney FROM players WHERE id = ?
        `).get(id) as PlayerRow | undefined;
        return row ? mapPlayer(row) : null;
    }

    updateBeads(
        playerId: number,
        currency: BeadCurrency,
        operation: BeadOperation,
        amount: number,
    ): AdminPlayerSummary | null {
        const column = currency === "paid" ? "vmoney" : "free_vmoney";
        const nextValue = operation === "set"
            ? "MIN(?, ?)"
            : `MIN(MAX(${column} + ?, 0), ?)`;
        const result = this.database.prepare(
            `UPDATE players SET ${column} = ${nextValue} WHERE id = ?`,
        ).run(amount, MAX_BEADS, playerId);
        return result.changes === 0 ? null : this.findPlayer(playerId);
    }
}
