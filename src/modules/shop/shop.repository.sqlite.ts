import type { DatabaseConnection } from "../../infrastructure/database/database";
import type { ShopType } from "../../content/master-data/shop-catalog";
import type { ShopPlayerState, ShopPurchaseState } from "./shop.models";
import type { ShopRepository } from "./shop.repository";

export class SqliteShopRepository implements ShopRepository {
    constructor(private readonly database: DatabaseConnection) {}

    getPlayerState(playerId: number): ShopPlayerState | null {
        const row = this.database
            .prepare(`
                SELECT star_crumb, free_vmoney, free_mana, bond_token, exp_pool, exp_pooled_time
                FROM players
                WHERE id = ?
            `)
            .get(playerId) as
            | {
                  star_crumb: number;
                  free_vmoney: number;
                  free_mana: number;
                  bond_token: number;
                  exp_pool: number;
                  exp_pooled_time: string;
              }
            | undefined;
        return row
            ? {
                  starCrumb: row.star_crumb,
                  freeVmoney: row.free_vmoney,
                  freeMana: row.free_mana,
                  bondToken: row.bond_token,
                  expPool: row.exp_pool,
                  expPooledTime: new Date(row.exp_pooled_time),
              }
            : null;
    }

    setPlayerState(playerId: number, state: ShopPlayerState): void {
        this.database
            .prepare(`
                UPDATE players
                SET star_crumb = ?, free_vmoney = ?, free_mana = ?, bond_token = ?, exp_pool = ?, exp_pooled_time = ?
                WHERE id = ?
            `)
            .run(
                state.starCrumb,
                state.freeVmoney,
                state.freeMana,
                state.bondToken,
                state.expPool,
                state.expPooledTime.toISOString(),
                playerId,
            );
    }

    getItemAmount(playerId: number, itemId: number): number {
        const row = this.database
            .prepare("SELECT amount FROM players_items WHERE player_id = ? AND id = ?")
            .get(playerId, itemId) as { amount: number } | undefined;
        return row?.amount ?? 0;
    }

    setItemAmount(playerId: number, itemId: number, amount: number): void {
        this.database
            .prepare(`
                INSERT INTO players_items (id, amount, player_id)
                VALUES (?, ?, ?)
                ON CONFLICT(id, player_id) DO UPDATE SET amount = excluded.amount
            `)
            .run(itemId, amount, playerId);
    }

    getPurchaseState(
        playerId: number,
        shopType: ShopType,
        shopItemId: number,
    ): ShopPurchaseState | null {
        const row = this.database
            .prepare(`
                SELECT today_purchase_num, today_period_key,
                       this_month_purchase_num, month_period_key,
                       total_purchase_num, updated_at
                FROM player_shop_purchases
                WHERE player_id = ? AND shop_type = ? AND shop_item_id = ?
            `)
            .get(playerId, shopType, shopItemId) as
            | {
                  today_purchase_num: number;
                  today_period_key: string;
                  this_month_purchase_num: number;
                  month_period_key: string;
                  total_purchase_num: number;
                  updated_at: string;
              }
            | undefined;
        return row
            ? {
                  playerId,
                  shopType,
                  shopItemId,
                  todayPurchaseNum: row.today_purchase_num,
                  todayPeriodKey: row.today_period_key,
                  thisMonthPurchaseNum: row.this_month_purchase_num,
                  monthPeriodKey: row.month_period_key,
                  totalPurchaseNum: row.total_purchase_num,
                  updatedAt: new Date(row.updated_at),
              }
            : null;
    }

    setPurchaseState(state: ShopPurchaseState): void {
        this.database
            .prepare(`
                INSERT INTO player_shop_purchases (
                    player_id, shop_type, shop_item_id,
                    today_purchase_num, today_period_key,
                    this_month_purchase_num, month_period_key,
                    total_purchase_num, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(player_id, shop_type, shop_item_id) DO UPDATE SET
                    today_purchase_num = excluded.today_purchase_num,
                    today_period_key = excluded.today_period_key,
                    this_month_purchase_num = excluded.this_month_purchase_num,
                    month_period_key = excluded.month_period_key,
                    total_purchase_num = excluded.total_purchase_num,
                    updated_at = excluded.updated_at
            `)
            .run(
                state.playerId,
                state.shopType,
                state.shopItemId,
                state.todayPurchaseNum,
                state.todayPeriodKey,
                state.thisMonthPurchaseNum,
                state.monthPeriodKey,
                state.totalPurchaseNum,
                state.updatedAt.toISOString(),
            );
    }

    transaction<T>(work: () => T): T {
        return this.database.transaction(work)();
    }
}
