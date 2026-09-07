import type { DatabaseConnection } from "../../infrastructure/database/database";
import type { GachaDefinition } from "../../content/master-data/gacha-catalog";
import type { RuntimeGachaBanner, RuntimeGachaSlot, SeasonalContentType, SeasonalGachaSlot } from "./seasonal-gacha.models";
import type { FeatureHistoryEntry, SeasonalGachaRepository } from "./seasonal-gacha.repository";

interface BannerRow {
    season_number: number;
    cycle_index: number;
    slot_type: RuntimeGachaSlot;
    shell_gacha_id: number;
    featured_ids_json: string;
    festival: number;
    starts_at: string;
    ends_at: string;
    definition_json: string;
}

function mapBanner(row: BannerRow): RuntimeGachaBanner {
    return {
        seasonNumber: row.season_number,
        cycleIndex: row.cycle_index,
        slot: row.slot_type,
        shellGachaId: row.shell_gacha_id,
        featuredIds: JSON.parse(row.featured_ids_json) as number[],
        festival: row.festival === 1,
        startsAt: new Date(row.starts_at),
        endsAt: new Date(row.ends_at),
        definition: JSON.parse(row.definition_json) as GachaDefinition,
    };
}

export class SqliteSeasonalGachaRepository implements SeasonalGachaRepository {
    constructor(private readonly database: DatabaseConnection) {}

    findBanner(seasonNumber: number, cycleIndex: number, slot: SeasonalGachaSlot): RuntimeGachaBanner | null {
        const row = this.database.prepare(`
            SELECT season_number, cycle_index, slot_type, shell_gacha_id,
                   featured_ids_json, festival, starts_at, ends_at, definition_json
            FROM runtime_gacha_banners
            WHERE season_number = ? AND cycle_index = ? AND slot_type = ?
        `).get(seasonNumber, cycleIndex, slot) as BannerRow | undefined;
        return row ? mapBanner(row) : null;
    }

    isBannerEnabled(seasonNumber: number, cycleIndex: number, slot: SeasonalGachaSlot): boolean {
        const row = this.database.prepare(`
            SELECT enabled FROM admin_gacha_overrides
            WHERE season_number = ? AND cycle_index = ? AND slot_type = ?
        `).get(seasonNumber, cycleIndex, slot) as { enabled: number } | undefined;
        return row?.enabled !== 0;
    }

    findEnabledBannerByShell(seasonNumber: number, cycleIndex: number, shellGachaId: number): RuntimeGachaBanner | null {
        const row = this.database.prepare(`
            SELECT b.season_number, b.cycle_index, b.slot_type, b.shell_gacha_id,
                   b.featured_ids_json, b.festival, b.starts_at, b.ends_at, b.definition_json
            FROM runtime_gacha_banners b
            LEFT JOIN admin_gacha_overrides o
              ON o.season_number = b.season_number
             AND o.cycle_index = b.cycle_index
             AND o.slot_type = b.slot_type
            WHERE b.season_number = ? AND b.cycle_index = ? AND b.shell_gacha_id = ?
              AND COALESCE(o.enabled, 1) = 1
            ORDER BY CASE b.slot_type WHEN 'new' THEN 0 WHEN 'rerun' THEN 1 WHEN 'weapon' THEN 2 ELSE 3 END
            LIMIT 1
        `).get(seasonNumber, cycleIndex, shellGachaId) as BannerRow | undefined;
        return row ? mapBanner(row) : null;
    }

    listEnabledBanners(seasonNumber: number, cycleIndex: number): RuntimeGachaBanner[] {
        return (this.database.prepare(`
            SELECT b.season_number, b.cycle_index, b.slot_type, b.shell_gacha_id,
                   b.featured_ids_json, b.festival, b.starts_at, b.ends_at, b.definition_json
            FROM runtime_gacha_banners b
            LEFT JOIN admin_gacha_overrides o
              ON o.season_number = b.season_number
             AND o.cycle_index = b.cycle_index
             AND o.slot_type = b.slot_type
            WHERE b.season_number = ? AND b.cycle_index = ?
              AND COALESCE(o.enabled, 1) = 1
            ORDER BY CASE b.slot_type WHEN 'new' THEN 0 WHEN 'rerun' THEN 1 WHEN 'weapon' THEN 2 ELSE 3 END,
                     b.slot_type ASC
        `).all(seasonNumber, cycleIndex) as BannerRow[]).map(mapBanner);
    }

    saveBanner(banner: RuntimeGachaBanner): void {
        this.database.prepare(`
            INSERT OR IGNORE INTO runtime_gacha_banners (
                season_number, cycle_index, slot_type, shell_gacha_id,
                featured_ids_json, festival, starts_at, ends_at, definition_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            banner.seasonNumber, banner.cycleIndex, banner.slot, banner.shellGachaId,
            JSON.stringify(banner.featuredIds), banner.festival ? 1 : 0,
            banner.startsAt.toISOString(), banner.endsAt.toISOString(),
            JSON.stringify(banner.definition), new Date().toISOString(),
        );
    }

    listReleased(contentType: SeasonalContentType): number[] {
        return (this.database.prepare(`
            SELECT content_id FROM released_gacha_content
            WHERE content_type = ? ORDER BY content_id
        `).all(contentType) as Array<{ content_id: number }>).map((row) => row.content_id);
    }

    release(contentType: SeasonalContentType, ids: readonly number[], seasonNumber: number, cycleIndex: number, at: Date): void {
        const statement = this.database.prepare(`
            INSERT OR IGNORE INTO released_gacha_content (
                content_type, content_id, released_season, released_cycle, released_at
            ) VALUES (?, ?, ?, ?, ?)
        `);
        for (const id of ids) statement.run(contentType, id, seasonNumber, cycleIndex, at.toISOString());
    }

    featureHistory(contentType: SeasonalContentType, slot: SeasonalGachaSlot): FeatureHistoryEntry[] {
        return this.database.prepare(`
            SELECT content_id, MAX(global_cycle) AS last_global_cycle
            FROM seasonal_gacha_feature_history
            WHERE content_type = ? AND slot_type = ? GROUP BY content_id
        `).all(contentType, slot).map((row: any) => ({
            contentId: row.content_id as number,
            lastGlobalCycle: row.last_global_cycle as number,
        }));
    }

    recordFeatured(contentType: SeasonalContentType, ids: readonly number[], slot: SeasonalGachaSlot, globalCycle: number, at: Date): void {
        const statement = this.database.prepare(`
            INSERT OR IGNORE INTO seasonal_gacha_feature_history (
                content_type, content_id, slot_type, global_cycle, featured_at
            ) VALUES (?, ?, ?, ?, ?)
        `);
        for (const id of ids) statement.run(contentType, id, slot, globalCycle, at.toISOString());
    }

    ensureEntitlement(playerId: number, dayKey: string): void {
        this.database.prepare(`
            INSERT OR IGNORE INTO player_gacha_daily_entitlements (player_id, campaign_day)
            VALUES (?, ?)
        `).run(playerId, dayKey);
    }

    isEntitlementAvailable(playerId: number, dayKey: string): boolean {
        const row = this.database.prepare(`
            SELECT consumed_at FROM player_gacha_daily_entitlements
            WHERE player_id = ? AND campaign_day = ?
        `).get(playerId, dayKey) as { consumed_at: string | null } | undefined;
        return row !== undefined && row.consumed_at === null;
    }

    consumeEntitlement(playerId: number, dayKey: string, consumedAt: Date): boolean {
        const result = this.database.prepare(`
            UPDATE player_gacha_daily_entitlements SET consumed_at = ?
            WHERE player_id = ? AND campaign_day = ? AND consumed_at IS NULL
        `).run(consumedAt.toISOString(), playerId, dayKey);
        return result.changes === 1;
    }

    transaction<T>(work: () => T): T { return this.database.transaction(work)(); }
}
