import type { GachaDefinition } from "../../content/master-data/gacha-catalog";
import type { DatabaseConnection } from "../../infrastructure/database/database";
import type { RuntimeGachaSlot, SeasonalGachaSlot } from "../gacha/seasonal-gacha.models";

export interface AdminPlayerSummary {
    id: number;
    name: string;
    comment: string;
    lastLoginTime: Date;
    paidVmoney: number;
    freeVmoney: number;
}

interface PlayerRow {
    id: number;
    name: string;
    comment: string;
    last_login_time: string;
    vmoney: number;
    free_vmoney: number;
}

function mapPlayer(row: PlayerRow): AdminPlayerSummary {
    return {
        id: row.id,
        name: row.name,
        comment: row.comment,
        lastLoginTime: new Date(row.last_login_time),
        paidVmoney: row.vmoney,
        freeVmoney: row.free_vmoney,
    };
}

export type BeadCurrency = "paid" | "free";
export type BeadOperation = "set" | "add";

const MAX_BEADS = 999_999_999;

interface AdminGachaRow {
    season_number: number;
    cycle_index: number;
    slot_type: RuntimeGachaSlot;
    shell_gacha_id: number;
    featured_ids_json: string;
    festival: number;
    starts_at: string;
    ends_at: string;
    definition_json: string;
    enabled: number | null;
    artwork_path: string | null;
}

export interface AdminGachaBanner {
    seasonNumber: number;
    cycleIndex: number;
    slot: RuntimeGachaSlot;
    shellGachaId: number;
    featuredIds: number[];
    festival: boolean;
    startsAt: Date;
    endsAt: Date;
    definition: GachaDefinition;
    enabled: boolean;
    artworkPath: string | null;
}

function mapGacha(row: AdminGachaRow): AdminGachaBanner {
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
        enabled: row.enabled !== 0,
        artworkPath: row.artwork_path,
    };
}

export class AdminWebRepository {
    constructor(private readonly database: DatabaseConnection) {}

    listPlayers(): AdminPlayerSummary[] {
        return (this.database.prepare(`
            SELECT id, name, comment, last_login_time, vmoney, free_vmoney
            FROM players ORDER BY last_login_time DESC, id ASC
        `).all() as PlayerRow[]).map(mapPlayer);
    }

    findPlayer(id: number): AdminPlayerSummary | null {
        const row = this.database.prepare(`
            SELECT id, name, comment, last_login_time, vmoney, free_vmoney FROM players WHERE id = ?
        `).get(id) as PlayerRow | undefined;
        return row ? mapPlayer(row) : null;
    }

    updateBeads(
        playerId: number,
        currency: BeadCurrency,
        operation: BeadOperation,
        amount: number,
    ): AdminPlayerSummary | null {
        const column = currency === "paid" ? "vmoney" : "free_vmoney";
        const nextValue = operation === "set"
            ? "MIN(?, ?)"
            : `MIN(MAX(${column} + ?, 0), ?)`;
        const result = this.database.prepare(
            `UPDATE players SET ${column} = ${nextValue} WHERE id = ?`,
        ).run(amount, MAX_BEADS, playerId);
        return result.changes === 0 ? null : this.findPlayer(playerId);
    }

    listCurrentGachas(now: Date): AdminGachaBanner[] {
        const instant = now.toISOString();
        return (this.database.prepare(`
            SELECT b.season_number, b.cycle_index, b.slot_type, b.shell_gacha_id,
                   b.featured_ids_json, b.festival, b.starts_at, b.ends_at, b.definition_json,
                   o.enabled, o.artwork_path
            FROM runtime_gacha_banners b
            LEFT JOIN admin_gacha_overrides o
              ON o.season_number = b.season_number
             AND o.cycle_index = b.cycle_index
             AND o.slot_type = b.slot_type
            WHERE b.season_number = (
                SELECT season_number FROM runtime_gacha_banners
                WHERE starts_at <= ?
                ORDER BY starts_at DESC, season_number DESC, cycle_index DESC
                LIMIT 1
            )
              AND b.cycle_index = (
                SELECT cycle_index FROM runtime_gacha_banners
                WHERE starts_at <= ?
                ORDER BY starts_at DESC, season_number DESC, cycle_index DESC
                LIMIT 1
            )
            ORDER BY CASE b.slot_type WHEN 'new' THEN 0 WHEN 'rerun' THEN 1 WHEN 'weapon' THEN 2 ELSE 3 END,
                     b.slot_type ASC
        `).all(instant, instant) as AdminGachaRow[]).map(mapGacha);
    }

    findGacha(seasonNumber: number, cycleIndex: number, slot: RuntimeGachaSlot): AdminGachaBanner | null {
        const row = this.database.prepare(`
            SELECT b.season_number, b.cycle_index, b.slot_type, b.shell_gacha_id,
                   b.featured_ids_json, b.festival, b.starts_at, b.ends_at, b.definition_json,
                   o.enabled, o.artwork_path
            FROM runtime_gacha_banners b
            LEFT JOIN admin_gacha_overrides o
              ON o.season_number = b.season_number
             AND o.cycle_index = b.cycle_index
             AND o.slot_type = b.slot_type
            WHERE b.season_number = ? AND b.cycle_index = ? AND b.slot_type = ?
        `).get(seasonNumber, cycleIndex, slot) as AdminGachaRow | undefined;
        return row ? mapGacha(row) : null;
    }

    createGacha(
        reference: AdminGachaBanner,
        slot: RuntimeGachaSlot,
        shellGachaId: number,
        definition: GachaDefinition,
    ): AdminGachaBanner | null {
        const duplicate = this.database.prepare(`
            SELECT 1 FROM runtime_gacha_banners
            WHERE season_number = ? AND cycle_index = ?
              AND (slot_type = ? OR shell_gacha_id = ?)
            LIMIT 1
        `).get(reference.seasonNumber, reference.cycleIndex, slot, shellGachaId);
        if (duplicate) return null;
        this.database.prepare(`
            INSERT INTO runtime_gacha_banners (
                season_number, cycle_index, slot_type, shell_gacha_id,
                featured_ids_json, festival, starts_at, ends_at, definition_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            reference.seasonNumber, reference.cycleIndex, slot, shellGachaId,
            JSON.stringify(Object.values(definition.pool).flat().filter((item) => item.isRateUp).map((item) => item.id)),
            0, reference.startsAt.toISOString(), reference.endsAt.toISOString(),
            JSON.stringify(definition), new Date().toISOString(),
        );
        return this.findGacha(reference.seasonNumber, reference.cycleIndex, slot);
    }

    setGachaEnabled(
        seasonNumber: number,
        cycleIndex: number,
        slot: RuntimeGachaSlot,
        enabled: boolean,
    ): AdminGachaBanner | null {
        if (!this.findGacha(seasonNumber, cycleIndex, slot)) return null;
        this.database.prepare(`
            INSERT INTO admin_gacha_overrides (
                season_number, cycle_index, slot_type, enabled, artwork_path, updated_at
            ) VALUES (?, ?, ?, ?, NULL, ?)
            ON CONFLICT(season_number, cycle_index, slot_type) DO UPDATE SET
                enabled = excluded.enabled,
                updated_at = excluded.updated_at
        `).run(seasonNumber, cycleIndex, slot, enabled ? 1 : 0, new Date().toISOString());
        return this.findGacha(seasonNumber, cycleIndex, slot);
    }

    updateGachaDefinition(
        seasonNumber: number,
        cycleIndex: number,
        slot: RuntimeGachaSlot,
        definition: GachaDefinition,
        featuredIds: readonly number[],
    ): AdminGachaBanner | null {
        const result = this.database.prepare(`
            UPDATE runtime_gacha_banners
            SET definition_json = ?, featured_ids_json = ?
            WHERE season_number = ? AND cycle_index = ? AND slot_type = ?
        `).run(
            JSON.stringify(definition),
            JSON.stringify(featuredIds),
            seasonNumber,
            cycleIndex,
            slot,
        );
        return result.changes === 0 ? null : this.findGacha(seasonNumber, cycleIndex, slot);
    }

    setGachaArtwork(
        seasonNumber: number,
        cycleIndex: number,
        slot: RuntimeGachaSlot,
        artworkPath: string | null,
    ): AdminGachaBanner | null {
        if (!this.findGacha(seasonNumber, cycleIndex, slot)) return null;
        this.database.prepare(`
            INSERT INTO admin_gacha_overrides (
                season_number, cycle_index, slot_type, enabled, artwork_path, updated_at
            ) VALUES (?, ?, ?, 1, ?, ?)
            ON CONFLICT(season_number, cycle_index, slot_type) DO UPDATE SET
                artwork_path = excluded.artwork_path,
                updated_at = excluded.updated_at
        `).run(seasonNumber, cycleIndex, slot, artworkPath, new Date().toISOString());
        return this.findGacha(seasonNumber, cycleIndex, slot);
    }
}
