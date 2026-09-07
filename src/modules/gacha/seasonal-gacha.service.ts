import { createHash } from "node:crypto";
import { GachaType, type GachaCatalog, type GachaDefinition, type GachaPoolItem } from "../../content/master-data/gacha-catalog";
import type { Clock } from "../../infrastructure/clock/clock";
import { InvalidRequestError, InvariantError } from "../../shared/errors/application-error";
import type { GachaRotationConfig } from "./gacha-rotation.config";
import { SeasonalGachaCalendar } from "./seasonal-gacha-calendar";
import type { RuntimeGachaBanner, SeasonalContentType, SeasonalGachaPortalState, SeasonalGachaSlot } from "./seasonal-gacha.models";
import type { SeasonalGachaRepository } from "./seasonal-gacha.repository";

const DAY_MS = 86_400_000;
const FEATURED_RATES = [0, 150, 100, 70, 50, 40] as const;

interface CatalogItem extends GachaPoolItem { firstSeen: string; }

function deterministicUnit(seed: string): number {
    return createHash("sha256").update(seed).digest().readUInt32BE(0) / 0x1_0000_0000;
}

function weightedCount(config: GachaRotationConfig, seed: string, available: number): number {
    const weights = config.featuredCountWeights.slice(0, Math.min(5, available));
    const total = weights.reduce((sum, value) => sum + value, 0);
    let roll = deterministicUnit(seed) * total;
    for (let index = 0; index < weights.length; index += 1) {
        roll -= weights[index] ?? 0;
        if (roll < 0) return index + 1;
    }
    return Math.max(1, weights.length);
}

function weightedSample(ids: readonly number[], count: number, seed: string, weight: (id: number) => number): number[] {
    return ids.map((id) => {
        const unit = Math.max(Number.EPSILON, deterministicUnit(`${seed}:${id}`));
        return { id, key: -Math.log(unit) / Math.max(Number.EPSILON, weight(id)) };
    }).sort((a, b) => a.key - b.key || a.id - b.id).slice(0, count).map((entry) => entry.id);
}

export class SeasonalGachaService {
    readonly calendar: SeasonalGachaCalendar;
    private readonly items = new Map<SeasonalContentType, Map<number, CatalogItem>>();

    constructor(
        private readonly repository: SeasonalGachaRepository,
        private readonly catalog: GachaCatalog,
        private readonly config: GachaRotationConfig,
        private readonly clock: Clock,
    ) {
        this.calendar = new SeasonalGachaCalendar(config);
        const clientShellTime = new Date(config.clientShellTime).getTime();
        for (const shellId of Object.values(config.shells)) {
            const shell = catalog.findById(shellId);
            if (!shell) throw new InvariantError(`Seasonal gacha shell ${shellId} is missing from gacha.json.`);
            const startsAt = new Date(`${shell.startDate.replace(" ", "T")}Z`).getTime();
            const endsAt = new Date(`${shell.endDate.replace(" ", "T")}Z`).getTime();
            if (clientShellTime < startsAt || clientShellTime > endsAt) {
                throw new InvariantError(`clientShellTime is outside gacha shell ${shellId}'s master window.`);
            }
        }
        this.items.set("character", this.collectItems(GachaType.CHARACTER));
        this.items.set("equipment", this.collectItems(GachaType.WEAPON));
    }

    ensureCurrentRotation(): void {
        const now = this.clock.now();
        const anchor = new Date(this.config.epoch);
        if (now < anchor) return;
        let cursor = anchor;
        while (cursor <= now) {
            const position = this.calendar.position(cursor);
            this.materialize(position.seasonNumber, position.cycleIndex, position.cycleStart, position.seasonEndExclusive);
            cursor = position.cycleEndExclusive;
        }
    }

    resolve(shellGachaId: number, now = this.clock.now()): RuntimeGachaBanner | null {
        this.ensureCurrentRotation();
        const position = this.calendar.position(now);
        const slot = this.slotForShell(shellGachaId);
        return slot ? this.repository.findBanner(position.seasonNumber, position.cycleIndex, slot) : null;
    }

    activeBanners(now = this.clock.now()): RuntimeGachaBanner[] {
        this.ensureCurrentRotation();
        const position = this.calendar.position(now);
        return (["new", "rerun", "weapon"] as const)
            .map((slot) => this.repository.findBanner(position.seasonNumber, position.cycleIndex, slot))
            .filter((banner): banner is RuntimeGachaBanner => banner !== null);
    }

    portalState(playerId: number, now = this.clock.now()): SeasonalGachaPortalState {
        this.ensureCurrentRotation();
        const campaign = this.calendar.isMonthEndCampaign(now);
        const dayKey = this.calendar.dayKey(now);
        if (campaign) this.repository.ensureEntitlement(playerId, dayKey);
        return {
            shellGachaIds: [this.config.shells.new, this.config.shells.rerun, this.config.shells.weapon],
            freeCampaignId: this.config.freeCampaignId,
            freeCampaignAvailable: campaign && this.repository.isEntitlementAvailable(playerId, dayKey),
        };
    }

    consumeDailyFree(playerId: number, shellGachaId: number, now = this.clock.now()): void {
        if (shellGachaId === this.config.shells.weapon || !this.slotForShell(shellGachaId)) {
            throw new InvalidRequestError("Daily free x10 is only available on seasonal character banners.");
        }
        if (!this.calendar.isMonthEndCampaign(now)) throw new InvalidRequestError("Free x10 campaign is not active.");
        const key = this.calendar.dayKey(now);
        this.repository.ensureEntitlement(playerId, key);
        if (!this.repository.consumeEntitlement(playerId, key, now)) {
            throw new InvalidRequestError("Daily free x10 has already been consumed.");
        }
    }

    private materialize(season: number, cycle: number, start: Date, seasonEnd: Date): void {
        if (this.repository.findBanner(season, cycle, "new")) return;
        this.repository.transaction(() => {
            this.seedReleased(season, cycle, start);
            const globalCycle = this.globalCycle(start);
            const newOrdinal = globalCycle + 1;
            const festival = newOrdinal % 6 === 0;
            const newIds = this.selectNew(season, cycle);
            this.repository.release("character", newIds, season, cycle, start);
            const rerunIds = this.selectWeighted("character", "rerun", globalCycle, this.config.rerunCooldownCycles, season, cycle);
            const weaponIds = this.selectWeighted("equipment", "weapon", globalCycle, this.config.weaponCooldownCycles, season, cycle);
            const end = new Date(Math.min(start.getTime() + this.config.bannerLifetimeDays * DAY_MS, seasonEnd.getTime()));
            const rows: Array<[SeasonalGachaSlot, number[], boolean]> = [
                ["new", newIds, festival], ["rerun", rerunIds, false], ["weapon", weaponIds, false],
            ];
            for (const [slot, featured, isFestival] of rows) {
                const contentType = slot === "weapon" ? "equipment" : "character";
                const banner: RuntimeGachaBanner = {
                    seasonNumber: season, cycleIndex: cycle, slot,
                    shellGachaId: this.config.shells[slot], featuredIds: featured,
                    festival: isFestival, startsAt: start, endsAt: end,
                    definition: this.buildDefinition(slot, featured, isFestival, start, end),
                };
                this.repository.saveBanner(banner);
                this.repository.recordFeatured(contentType, featured, slot, globalCycle, start);
            }
        });
    }

    private seedReleased(season: number, cycle: number, at: Date): void {
        if (this.repository.listReleased("character").length === 0) {
            const characters = [...(this.items.get("character")?.values() ?? [])];
            const baseline = characters.filter((item) => item.rank < 5).map((item) => item.id);
            const earliestFive = characters.filter((item) => item.rank === 5).sort((a, b) => a.firstSeen.localeCompare(b.firstSeen)).slice(0, 12).map((item) => item.id);
            this.repository.release("character", [...baseline, ...earliestFive], season, cycle, at);
        }
        if (this.repository.listReleased("equipment").length === 0) {
            this.repository.release("equipment", [...(this.items.get("equipment")?.keys() ?? [])], season, cycle, at);
        }
    }

    private selectNew(season: number, cycle: number): number[] {
        const released = new Set(this.repository.listReleased("character"));
        const candidates = [...(this.items.get("character")?.values() ?? [])]
            .filter((item) => item.rank === 5 && !released.has(item.id)).map((item) => item.id);
        if (candidates.length === 0) throw new InvariantError("Seasonal NEW catalog is exhausted.");
        const seed = `${this.config.seed}:${season}:${cycle}:new`;
        return weightedSample(candidates, weightedCount(this.config, seed, candidates.length), seed, () => 1);
    }

    private selectWeighted(type: SeasonalContentType, slot: SeasonalGachaSlot, globalCycle: number, cooldown: number, season: number, cycle: number): number[] {
        const itemMap = this.items.get(type) ?? new Map();
        const history = new Map(this.repository.featureHistory(type, slot).map((entry) => [entry.contentId, entry.lastGlobalCycle]));
        const released = this.repository.listReleased(type).filter((id) => itemMap.get(id)?.rank === 5);
        let candidates = released.filter((id) => globalCycle - (history.get(id) ?? -1_000_000) > cooldown);
        if (candidates.length === 0) candidates = released;
        if (candidates.length === 0) throw new InvariantError(`No released ${type} candidates for ${slot}.`);
        const seed = `${this.config.seed}:${season}:${cycle}:${slot}`;
        const count = weightedCount(this.config, seed, candidates.length);
        return weightedSample(candidates, count, seed, (id) => Math.max(1, globalCycle - (history.get(id) ?? -1)));
    }

    private buildDefinition(slot: SeasonalGachaSlot, featured: number[], festival: boolean, start: Date, end: Date): GachaDefinition {
        const shellId = this.config.shells[slot];
        const shell = this.catalog.findById(shellId);
        if (!shell) throw new InvariantError(`Seasonal gacha shell ${shellId} is missing from gacha.json.`);
        const type: SeasonalContentType = slot === "weapon" ? "equipment" : "character";
        const released = new Set(this.repository.listReleased(type));
        const source = [...(this.items.get(type)?.values() ?? [])].filter((item) => released.has(item.id));
        const totalFive = festival && type === "character" ? 750 : (type === "character" ? 500 : 500);
        const featuredEach = FEATURED_RATES[featured.length] ?? 40;
        const featuredTotal = featuredEach * featured.length;
        const byRank: Record<number, GachaPoolItem[]> = { 1: [], 2: [], 3: [] };
        for (const rank of [5, 4, 3]) {
            const key = 6 - rank;
            const items = source.filter((item) => item.rank === rank);
            const featuredAtRank = rank === 5 ? items.filter((item) => featured.includes(item.id)) : [];
            const off = items.filter((item) => !featured.includes(item.id));
            const rankBudget = rank === 5 ? totalFive : (rank === 4 ? 2500 : (festival && type === "character" ? 6750 : 7000));
            const offBudget = Math.max(1, rankBudget - (rank === 5 ? featuredTotal : 0));
            byRank[key] = [
                ...featuredAtRank.map((item) => ({ ...item, isRateUp: true, odds: featuredEach, weight: featuredEach * 10_000 })),
                ...off.map((item) => ({ ...item, isRateUp: false, odds: offBudget / Math.max(1, off.length), weight: Math.max(1, Math.round(offBudget * 10_000 / Math.max(1, off.length))) })),
            ];
            if (byRank[key].length === 0) throw new InvariantError(`Runtime ${slot} pool has no rank ${rank} content.`);
        }
        return {
            ...shell, startDate: start.toISOString(), endDate: end.toISOString(), pool: byRank,
            rankWeights: festival && type === "character" ? [750, 2500, 6750] : [500, 2500, 7000],
            ...(festival ? { movieName: "fes", guaranteeMovieName: "fes_guarantee" } : {}),
        };
    }

    private collectItems(type: GachaType): Map<number, CatalogItem> {
        const result = new Map<number, CatalogItem>();
        const cutoff = new Date(this.config.sourceCutoffAt).getTime();
        for (const gacha of this.catalog.listAll().filter((entry) => {
            const sourceStart = new Date(`${entry.startDate.replace(" ", "T")}Z`).getTime();
            return entry.type === type
                && !this.config.excludedGachaIds.includes(entry.id)
                && Number.isFinite(sourceStart)
                && sourceStart <= cutoff;
        })) {
            for (const item of Object.values(gacha.pool).flat()) {
                const previous = result.get(item.id);
                if (!previous || gacha.startDate < previous.firstSeen) result.set(item.id, { ...item, firstSeen: gacha.startDate });
            }
        }
        return result;
    }

    private slotForShell(id: number): SeasonalGachaSlot | null {
        if (id === this.config.shells.new) return "new";
        if (id === this.config.shells.rerun) return "rerun";
        if (id === this.config.shells.weapon) return "weapon";
        return null;
    }

    private globalCycle(start: Date): number {
        const current = this.calendar.position(start);
        let ordinal = 0;
        let cursor = new Date(this.config.epoch);
        while (cursor < current.seasonStart) {
            const season = this.calendar.position(cursor);
            ordinal += Math.ceil(
                (season.seasonEndExclusive.getTime() - season.seasonStart.getTime())
                / (this.config.cycleDays * DAY_MS),
            );
            cursor = season.seasonEndExclusive;
        }
        return ordinal + current.cycleIndex;
    }
}
