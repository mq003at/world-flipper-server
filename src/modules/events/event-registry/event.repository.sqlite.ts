import type { DatabaseConnection } from "../../../infrastructure/database/database";
import type { PlayerEventState } from "./event.models";
import type { EventRepository } from "./event.repository";

interface EventRow {
    player_id: number;
    event_key: string;
    joined_at: string;
    last_seen_at: string;
    completed_at: string | null;
    payload_json: string;
}

function fromRow(row: EventRow): PlayerEventState {
    return {
        playerId: row.player_id,
        eventKey: row.event_key,
        joinedAt: new Date(row.joined_at),
        lastSeenAt: new Date(row.last_seen_at),
        completedAt: row.completed_at === null ? null : new Date(row.completed_at),
        payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    };
}

export class SqliteEventRepository implements EventRepository {
    constructor(private readonly database: DatabaseConnection) {}

    get(playerId: number, eventKey: string): PlayerEventState | null {
        const row = this.database.prepare(`
            SELECT * FROM player_event_state WHERE player_id = ? AND event_key = ?
        `).get(playerId, eventKey) as EventRow | undefined;
        return row ? fromRow(row) : null;
    }

    upsert(state: PlayerEventState): void {
        this.database.prepare(`
            INSERT INTO player_event_state (
                player_id, event_key, joined_at, last_seen_at, completed_at, payload_json
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(player_id, event_key) DO UPDATE SET
                last_seen_at = excluded.last_seen_at,
                completed_at = excluded.completed_at,
                payload_json = excluded.payload_json
        `).run(
            state.playerId,
            state.eventKey,
            state.joinedAt.toISOString(),
            state.lastSeenAt.toISOString(),
            state.completedAt?.toISOString() ?? null,
            JSON.stringify(state.payload),
        );
    }

    transaction<T>(work: () => T): T {
        return this.database.transaction(work)();
    }
}
