import type { DatabaseConnection } from "../../infrastructure/database/database";

export interface AdminPlayerSummary {
    id: number;
    name: string;
    comment: string;
    lastLoginTime: Date;
}

interface PlayerRow {
    id: number;
    name: string;
    comment: string;
    last_login_time: string;
}

function mapPlayer(row: PlayerRow): AdminPlayerSummary {
    return { id: row.id, name: row.name, comment: row.comment, lastLoginTime: new Date(row.last_login_time) };
}

export class AdminWebRepository {
    constructor(private readonly database: DatabaseConnection) {}

    listPlayers(): AdminPlayerSummary[] {
        return (this.database.prepare(`
            SELECT id, name, comment, last_login_time
            FROM players ORDER BY last_login_time DESC, id ASC
        `).all() as PlayerRow[]).map(mapPlayer);
    }

    findPlayer(id: number): AdminPlayerSummary | null {
        const row = this.database.prepare(`
            SELECT id, name, comment, last_login_time FROM players WHERE id = ?
        `).get(id) as PlayerRow | undefined;
        return row ? mapPlayer(row) : null;
    }
}
