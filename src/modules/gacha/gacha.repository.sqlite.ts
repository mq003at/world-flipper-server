import type { DatabaseConnection } from "../../infrastructure/database/database";
import type {
    GachaPlayerWallet,
    PlayerGachaCampaignState,
    PlayerGachaInfoState,
} from "./gacha.models";
import type { GachaRepository } from "./gacha.repository";

function fromDbBoolean(value: number): boolean {
    return value === 1;
}

function toDbBoolean(value: boolean): number {
    return value ? 1 : 0;
}

export class SqliteGachaRepository implements GachaRepository {
    constructor(private readonly database: DatabaseConnection) {}

    getWallet(playerId: number): GachaPlayerWallet | null {
        const row = this.database
            .prepare("SELECT free_vmoney, vmoney FROM players WHERE id = ?")
            .get(playerId) as { free_vmoney: number; vmoney: number } | undefined;
        return row ? { freeVmoney: row.free_vmoney, vmoney: row.vmoney } : null;
    }

    setWallet(playerId: number, wallet: GachaPlayerWallet): void {
        this.database
            .prepare("UPDATE players SET free_vmoney = ?, vmoney = ? WHERE id = ?")
            .run(wallet.freeVmoney, wallet.vmoney, playerId);
    }

    getItemAmount(playerId: number, itemId: number): number | null {
        const row = this.database
            .prepare("SELECT amount FROM players_items WHERE player_id = ? AND id = ?")
            .get(playerId, itemId) as { amount: number } | undefined;
        return row?.amount ?? null;
    }

    setItemAmount(playerId: number, itemId: number, amount: number): void {
        this.database
            .prepare(`
                INSERT INTO players_items (id, amount, player_id)
                VALUES (?, ?, ?)
                ON CONFLICT(id, player_id)
                DO UPDATE SET amount = excluded.amount
            `)
            .run(itemId, amount, playerId);
    }

    findGachaInfo(playerId: number, gachaId: number): PlayerGachaInfoState | null {
        const row = this.database
            .prepare(`
                SELECT gacha_id, is_daily_first, is_account_first, gacha_exchange_point
                FROM players_gacha_info
                WHERE player_id = ? AND gacha_id = ?
            `)
            .get(playerId, gachaId) as
            | {
                  gacha_id: number;
                  is_daily_first: number;
                  is_account_first: number;
                  gacha_exchange_point: number | null;
              }
            | undefined;

        return row
            ? {
                  gachaId: row.gacha_id,
                  isDailyFirst: fromDbBoolean(row.is_daily_first),
                  isAccountFirst: fromDbBoolean(row.is_account_first),
                  gachaExchangePoint: row.gacha_exchange_point ?? 0,
              }
            : null;
    }

    upsertGachaInfo(playerId: number, info: PlayerGachaInfoState): void {
        this.database
            .prepare(`
                INSERT INTO players_gacha_info (
                    gacha_id, is_daily_first, is_account_first, gacha_exchange_point, player_id
                ) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(gacha_id, player_id)
                DO UPDATE SET
                    is_daily_first = excluded.is_daily_first,
                    is_account_first = excluded.is_account_first,
                    gacha_exchange_point = excluded.gacha_exchange_point
            `)
            .run(
                info.gachaId,
                toDbBoolean(info.isDailyFirst),
                toDbBoolean(info.isAccountFirst),
                info.gachaExchangePoint,
                playerId,
            );
    }

    findCampaign(
        playerId: number,
        gachaId: number,
        campaignId: number,
    ): PlayerGachaCampaignState | null {
        const row = this.database
            .prepare(`
                SELECT gacha_id, campaign_id, count
                FROM players_gacha_campaigns
                WHERE player_id = ? AND gacha_id = ? AND campaign_id = ?
            `)
            .get(playerId, gachaId, campaignId) as
            | { gacha_id: number; campaign_id: number; count: number }
            | undefined;

        return row
            ? {
                  gachaId: row.gacha_id,
                  campaignId: row.campaign_id,
                  count: row.count,
              }
            : null;
    }

    upsertCampaign(playerId: number, campaign: PlayerGachaCampaignState): void {
        this.database
            .prepare(`
                INSERT INTO players_gacha_campaigns (gacha_id, campaign_id, count, player_id)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(gacha_id, campaign_id, player_id)
                DO UPDATE SET count = excluded.count
            `)
            .run(campaign.gachaId, campaign.campaignId, campaign.count, playerId);
    }

    transaction<T>(work: () => T): T {
        return this.database.transaction(work)();
    }
}
