import type { DatabaseConnection } from "../../../infrastructure/database/database";
import type {
    BoxGachaPlayerInfo,
    DrawnBoxRewardState,
    PlayerBoxGachaState,
} from "./box-gacha.models";
import type { BoxGachaRepository } from "./box-gacha.repository";

export class SqliteBoxGachaRepository implements BoxGachaRepository {
    constructor(private readonly database: DatabaseConnection) {}

    getBoxState(playerId: number, gachaId: number, boxId: number): PlayerBoxGachaState | null {
        const row = this.database.prepare(`
            SELECT id, box_id, reset_times, remaining_number, is_closed, player_id
            FROM players_box_gacha
            WHERE player_id = ? AND id = ? AND box_id = ?
        `).get(playerId, gachaId, boxId) as
            | { id: number; box_id: number; reset_times: number; remaining_number: number; is_closed: number; player_id: number }
            | undefined;
        return row ? {
            playerId: row.player_id,
            gachaId: row.id,
            boxId: row.box_id,
            resetTimes: row.reset_times,
            remainingNumber: row.remaining_number,
            isClosed: row.is_closed === 1,
        } : null;
    }

    setBoxState(state: PlayerBoxGachaState): void {
        this.database.prepare(`
            INSERT INTO players_box_gacha (
                id, box_id, reset_times, remaining_number, is_closed, player_id
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id, box_id, player_id) DO UPDATE SET
                reset_times = excluded.reset_times,
                remaining_number = excluded.remaining_number,
                is_closed = excluded.is_closed
        `).run(
            state.gachaId,
            state.boxId,
            state.resetTimes,
            state.remainingNumber,
            state.isClosed ? 1 : 0,
            state.playerId,
        );
    }

    getDrawnRewards(playerId: number, gachaId: number, boxId: number): DrawnBoxRewardState[] {
        const rows = this.database.prepare(`
            SELECT id, number
            FROM players_box_gacha_drawn_rewards
            WHERE player_id = ? AND gacha_id = ? AND box_id = ?
            ORDER BY id
        `).all(playerId, gachaId, boxId) as Array<{ id: number; number: number }>;
        return rows.map((row) => ({ rewardId: row.id, number: row.number }));
    }

    setDrawnReward(
        playerId: number,
        gachaId: number,
        boxId: number,
        rewardId: number,
        number: number,
    ): void {
        this.database.prepare(`
            INSERT INTO players_box_gacha_drawn_rewards (id, box_id, gacha_id, number, player_id)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id, box_id, gacha_id, player_id) DO UPDATE SET
                number = excluded.number
        `).run(rewardId, boxId, gachaId, number, playerId);
    }

    getItemAmount(playerId: number, itemId: number): number {
        const row = this.database.prepare(`
            SELECT amount FROM players_items WHERE player_id = ? AND id = ?
        `).get(playerId, itemId) as { amount: number } | undefined;
        return row?.amount ?? 0;
    }

    setItemAmount(playerId: number, itemId: number, amount: number): void {
        this.database.prepare(`
            INSERT INTO players_items (id, amount, player_id)
            VALUES (?, ?, ?)
            ON CONFLICT(id, player_id) DO UPDATE SET amount = excluded.amount
        `).run(itemId, amount, playerId);
    }

    getPlayerInfo(playerId: number): BoxGachaPlayerInfo | null {
        const row = this.database.prepare(`
            SELECT free_mana, exp_pool, exp_pooled_time FROM players WHERE id = ?
        `).get(playerId) as { free_mana: number; exp_pool: number; exp_pooled_time: string } | undefined;
        return row ? {
            freeMana: row.free_mana,
            expPool: row.exp_pool,
            expPooledTime: new Date(row.exp_pooled_time),
        } : null;
    }

    transaction<T>(work: () => T): T {
        return this.database.transaction(work)();
    }
}
