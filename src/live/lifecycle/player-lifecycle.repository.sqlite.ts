import type { DatabaseConnection } from "../../infrastructure/database/database";
import type { PlayerLifecycleState } from "./player-lifecycle.models";
import type { PlayerLifecycleRepository } from "./player-lifecycle.repository";

export class SqlitePlayerLifecycleRepository implements PlayerLifecycleRepository {
    constructor(private readonly database: DatabaseConnection) {}

    find(playerId: number): PlayerLifecycleState | null {
        const row = this.database.prepare(`
            SELECT player_id, daily_key, weekly_key, monthly_key, updated_at
            FROM player_lifecycle_state WHERE player_id = ?
        `).get(playerId) as {
            player_id: number; daily_key: string; weekly_key: string; monthly_key: string; updated_at: string;
        } | undefined;
        return row ? {
            playerId: row.player_id,
            dailyKey: row.daily_key,
            weeklyKey: row.weekly_key,
            monthlyKey: row.monthly_key,
            updatedAt: new Date(row.updated_at),
        } : null;
    }

    getLastLoginTime(playerId: number): Date | null {
        const row = this.database.prepare("SELECT last_login_time FROM players WHERE id = ?")
            .get(playerId) as { last_login_time: string } | undefined;
        return row ? new Date(row.last_login_time) : null;
    }

    upsert(state: PlayerLifecycleState): void {
        this.database.prepare(`
            INSERT INTO player_lifecycle_state (player_id, daily_key, weekly_key, monthly_key, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(player_id) DO UPDATE SET
                daily_key = excluded.daily_key,
                weekly_key = excluded.weekly_key,
                monthly_key = excluded.monthly_key,
                updated_at = excluded.updated_at
        `).run(state.playerId, state.dailyKey, state.weeklyKey, state.monthlyKey, state.updatedAt.toISOString());
    }

    applyDailyReset(playerId: number): void {
        this.database.prepare(`
            UPDATE players SET boost_point = 3, boss_boost_point = 3 WHERE id = ?
        `).run(playerId);
        this.database.prepare(`
            UPDATE players_gacha_info SET is_daily_first = 1 WHERE player_id = ?
        `).run(playerId);
        this.database.prepare(`
            UPDATE players_gacha_campaigns SET count = 1 WHERE player_id = ?
        `).run(playerId);
        this.database.prepare(`
            UPDATE daily_challenge_point_list_entries SET point = 0 WHERE player_id = ?
        `).run(playerId);
    }

    transaction<T>(work: () => T): T {
        return this.database.transaction(work)();
    }
}
