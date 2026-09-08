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

    findBanner(seasonNumber: number, cycleIndex: number, slot: RuntimeGachaSlot): RuntimeGachaBanner | null {
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

    findEnabledBannerByShell(at: Date, shellGachaId: number): RuntimeGachaBanner | null {
        const instant = at.toISOString();
        const row = this.database.prepare(`
            SELECT b.season_number, b.cycle_index, b.slot_type, b.shell_gacha_id,
                   b.featured_ids_json, b.festival, b.starts_at, b.ends_at, b.definition_json
            FROM runtime_gacha_banners b
            LEFT JOIN admin_gacha_overrides o
              ON o.season_number = b.season_number
             AND o.cycle_index = b.cycle_index
             AND o.slot_type = b.slot_type
            WHERE b.starts_at <= ? AND b.ends_at > ? AND b.shell_gacha_id = ?
              AND COALESCE(o.enabled, 1) = 1
            ORDER BY CASE b.slot_type
                WHEN 'base' THEN 0 WHEN 'new' THEN 1 WHEN 'elemental' THEN 2
                WHEN 'weapon' THEN 3 WHEN 'rerun' THEN 4 WHEN 'meteor-1' THEN 5
                WHEN 'meteor-2' THEN 6 WHEN 'anniversary' THEN 7 ELSE 8 END
            LIMIT 1
        `).get(instant, instant, shellGachaId) as BannerRow | undefined;
        return row ? mapBanner(row) : null;
    }

    listEnabledBanners(at: Date): RuntimeGachaBanner[] {
        const instant = at.toISOString();
        return (this.database.prepare(`
            SELECT b.season_number, b.cycle_index, b.slot_type, b.shell_gacha_id,
                   b.featured_ids_json, b.festival, b.starts_at, b.ends_at, b.definition_json
            FROM runtime_gacha_banners b
            LEFT JOIN admin_gacha_overrides o
              ON o.season_number = b.season_number
             AND o.cycle_index = b.cycle_index
             AND o.slot_type = b.slot_type
            WHERE b.starts_at <= ? AND b.ends_at > ?
              AND COALESCE(o.enabled, 1) = 1
            ORDER BY CASE b.slot_type
                       WHEN 'base' THEN 0 WHEN 'new' THEN 1 WHEN 'elemental' THEN 2
                       WHEN 'weapon' THEN 3 WHEN 'rerun' THEN 4 WHEN 'meteor-1' THEN 5
                       WHEN 'meteor-2' THEN 6 WHEN 'anniversary' THEN 7 ELSE 8 END,
                     b.slot_type ASC
        `).all(instant, instant) as BannerRow[]).map(mapBanner);
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

    listReleased(contentType: SeasonalContentType, seasonNumber: number): number[] {
        return (this.database.prepare(`
            SELECT unit_id FROM season_unit_release
            WHERE content_type = ? AND season_number = ? ORDER BY unit_id
        `).all(contentType, seasonNumber) as Array<{ unit_id: number }>).map((row) => row.unit_id);
    }

    release(contentType: SeasonalContentType, ids: readonly number[], seasonNumber: number, cycleIndex: number, at: Date, sourceBannerType = "base"): void {
        const statement = this.database.prepare(`
            INSERT OR IGNORE INTO season_unit_release (
                season_number, content_type, unit_id, released_at, source_banner_type, source_banner_run_id
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const id of ids) statement.run(seasonNumber, contentType, id, at.toISOString(), sourceBannerType, `${seasonNumber}:${cycleIndex}:${sourceBannerType}`);
    }

    featureHistory(contentType: SeasonalContentType, slot: SeasonalGachaSlot, seasonNumber: number): FeatureHistoryEntry[] {
        return this.database.prepare(`
            SELECT content_id, MAX(cycle_index) AS last_global_cycle
            FROM seasonal_gacha_feature_history_v2
            WHERE season_number = ? AND content_type = ? AND slot_type = ?
            GROUP BY content_id
        `).all(seasonNumber, contentType, slot).map((row: any) => ({
            contentId: row.content_id as number,
            lastGlobalCycle: row.last_global_cycle as number,
        }));
    }

    recordFeatured(contentType: SeasonalContentType, ids: readonly number[], slot: SeasonalGachaSlot, seasonNumber: number, cycleIndex: number, at: Date): void {
        const statement = this.database.prepare(`
            INSERT OR IGNORE INTO seasonal_gacha_feature_history_v2 (
                season_number, content_type, content_id, slot_type, cycle_index, featured_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const id of ids) statement.run(seasonNumber, contentType, id, slot, cycleIndex, at.toISOString());
    }

    ensureEntitlement(playerId: number, dayKey: string): void {
        const { bannerRunId, calendarDate } = this.parseDailyEntitlementKey(dayKey);
        this.database.prepare(`
            INSERT OR IGNORE INTO player_banner_daily_entitlements (player_id, banner_run_id, calendar_date)
            VALUES (?, ?, ?)
        `).run(playerId, bannerRunId, calendarDate);
    }

    isEntitlementAvailable(playerId: number, dayKey: string): boolean {
        const { bannerRunId, calendarDate } = this.parseDailyEntitlementKey(dayKey);
        const row = this.database.prepare(`
            SELECT consumed_at FROM player_banner_daily_entitlements
            WHERE player_id = ? AND banner_run_id = ? AND calendar_date = ?
        `).get(playerId, bannerRunId, calendarDate) as { consumed_at: string | null } | undefined;
        return row !== undefined && row.consumed_at === null;
    }

    consumeEntitlement(playerId: number, dayKey: string, consumedAt: Date): boolean {
        const { bannerRunId, calendarDate } = this.parseDailyEntitlementKey(dayKey);
        const result = this.database.prepare(`
            UPDATE player_banner_daily_entitlements SET consumed_at = ?
            WHERE player_id = ? AND banner_run_id = ? AND calendar_date = ? AND consumed_at IS NULL
        `).run(consumedAt.toISOString(), playerId, bannerRunId, calendarDate);
        return result.changes === 1;
    }

    consumeBaseFirstMulti(playerId: number, seasonNumber: number, consumedAt: Date): boolean {
        this.ensureSeasonEntitlement(playerId, seasonNumber);
        const result = this.database.prepare(`
            UPDATE player_season_gacha_entitlements SET base_first_multi_consumed_at = ?
            WHERE player_id = ? AND season_number = ? AND base_first_multi_consumed_at IS NULL
        `).run(consumedAt.toISOString(), playerId, seasonNumber);
        return result.changes === 1;
    }

    consumeBaseSelector(playerId: number, seasonNumber: number, characterId: number, consumedAt: Date): boolean {
        this.ensureSeasonEntitlement(playerId, seasonNumber);
        const result = this.database.prepare(`
            UPDATE player_season_gacha_entitlements
            SET base_selector_consumed_at = ?, base_selector_character_id = ?
            WHERE player_id = ? AND season_number = ? AND base_selector_consumed_at IS NULL
        `).run(consumedAt.toISOString(), characterId, playerId, seasonNumber);
        return result.changes === 1;
    }

    private ensureSeasonEntitlement(playerId: number, seasonNumber: number): void {
        this.database.prepare(`
            INSERT OR IGNORE INTO player_season_gacha_entitlements (player_id, season_number)
            VALUES (?, ?)
        `).run(playerId, seasonNumber);
    }

    private parseDailyEntitlementKey(dayKey: string): { bannerRunId: string; calendarDate: string } {
        const separator = dayKey.lastIndexOf(":");
        if (separator <= 0 || separator === dayKey.length - 1) {
            throw new Error(`Invalid daily gacha entitlement key '${dayKey}'.`);
        }
        return { bannerRunId: dayKey.slice(0, separator), calendarDate: dayKey.slice(separator + 1) };
    }

    transaction<T>(work: () => T): T {
        this.database.exec("BEGIN IMMEDIATE");
        try {
            const result = work();
            this.database.exec("COMMIT");
            return result;
        } catch (error) {
            this.database.exec("ROLLBACK");
            throw error;
        }
    }
}
