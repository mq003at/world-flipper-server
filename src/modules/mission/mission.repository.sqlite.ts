import type { DatabaseConnection } from "../../infrastructure/database/database";
import type { MissionProgressState } from "./mission.models";
import type { MissionRepository } from "./mission.repository";

export class SqliteMissionRepository implements MissionRepository {
    constructor(private readonly database: DatabaseConnection) {}

    get(playerId: number, missionId: number, periodKey: string): MissionProgressState | null {
        const row = this.database.prepare(`
            SELECT player_id, mission_id, period_key, progress, completed_at, claimed_at, last_event_key, updated_at
            FROM live_mission_progress
            WHERE player_id = ? AND mission_id = ? AND period_key = ?
        `).get(playerId, missionId, periodKey) as {
            player_id: number;
            mission_id: number;
            period_key: string;
            progress: number;
            completed_at: string | null;
            claimed_at: string | null;
            last_event_key: string | null;
            updated_at: string;
        } | undefined;
        return row ? {
            playerId: row.player_id,
            missionId: row.mission_id,
            periodKey: row.period_key,
            progress: row.progress,
            completedAt: row.completed_at ? new Date(row.completed_at) : null,
            claimedAt: row.claimed_at ? new Date(row.claimed_at) : null,
            lastEventKey: row.last_event_key,
            updatedAt: new Date(row.updated_at),
        } : null;
    }

    upsert(state: MissionProgressState): void {
        this.database.prepare(`
            INSERT INTO live_mission_progress (
                player_id, mission_id, period_key, progress, completed_at, claimed_at, last_event_key, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(player_id, mission_id, period_key) DO UPDATE SET
                progress = excluded.progress,
                completed_at = excluded.completed_at,
                claimed_at = excluded.claimed_at,
                last_event_key = excluded.last_event_key,
                updated_at = excluded.updated_at
        `).run(
            state.playerId,
            state.missionId,
            state.periodKey,
            state.progress,
            state.completedAt?.toISOString() ?? null,
            state.claimedAt?.toISOString() ?? null,
            state.lastEventKey,
            state.updatedAt.toISOString(),
        );
        this.mirrorLegacy(state);
    }

    markClaimed(playerId: number, missionId: number, periodKey: string, claimedAt: Date): void {
        this.database.prepare(`
            UPDATE live_mission_progress
            SET claimed_at = ?, updated_at = ?
            WHERE player_id = ? AND mission_id = ? AND period_key = ?
        `).run(claimedAt.toISOString(), claimedAt.toISOString(), playerId, missionId, periodKey);
        this.database.prepare(`DELETE FROM players_active_missions WHERE player_id = ? AND id = ?`)
            .run(playerId, missionId);
    }

    transaction<T>(work: () => T): T {
        return this.database.transaction(work)();
    }

    private mirrorLegacy(state: MissionProgressState): void {
        if (state.claimedAt) {
            this.database.prepare(`DELETE FROM players_active_missions WHERE player_id = ? AND id = ?`)
                .run(state.playerId, state.missionId);
            return;
        }
        this.database.prepare(`
            INSERT INTO players_active_missions (id, progress, player_id)
            VALUES (?, ?, ?)
            ON CONFLICT(id, player_id) DO UPDATE SET progress = excluded.progress
        `).run(state.missionId, state.progress, state.playerId);
        this.database.prepare(`
            INSERT INTO players_active_missions_stages (id, status, player_id, mission_id)
            VALUES (1, ?, ?, ?)
            ON CONFLICT(id, mission_id, player_id) DO UPDATE SET status = excluded.status
        `).run(state.completedAt ? 1 : 0, state.playerId, state.missionId);
    }
}
