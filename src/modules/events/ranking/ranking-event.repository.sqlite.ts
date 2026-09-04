import type { DatabaseConnection } from "../../../infrastructure/database/database";
import type { RankingEventRepository } from "./ranking-event.repository";

export class SqliteRankingEventRepository implements RankingEventRepository {
    constructor(private readonly database: DatabaseConnection) {}
    hasClaimed(playerId: number, eventId: number): boolean {
        return this.database.prepare(`SELECT 1 AS ok FROM player_ranking_event_rewards WHERE player_id = ? AND event_id = ?`)
            .get(playerId,eventId) !== undefined;
    }
    markClaimed(playerId: number, eventId: number, claimedAt: Date): void {
        this.database.prepare(`INSERT OR IGNORE INTO player_ranking_event_rewards (player_id,event_id,claimed_at) VALUES (?,?,?)`)
            .run(playerId,eventId,claimedAt.toISOString());
    }
}
