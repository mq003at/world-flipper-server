import { createHash } from "node:crypto";
import { GachaType, type GachaCatalog, type GachaDefinition, type GachaPoolItem } from "../../content/master-data/gacha-catalog";
import type { CharacterCatalog } from "../../content/master-data/character-catalog";
import type { Clock } from "../../infrastructure/clock/clock";
import { InvalidRequestError, InvariantError } from "../../shared/errors/application-error";
import { applyGachaPoolPolicy, type GachaPoolSelection } from "./gacha-pool-policy";
import type { GachaRotationConfig, ManualSeasonalBannerConfig } from "./gacha-rotation.config";
import { SeasonalGachaCalendar } from "./seasonal-gacha-calendar";
import type { CalendarBannerWindow, RuntimeGachaBanner, SeasonalContentType, SeasonalGachaPortalState, SeasonalGachaSlot } from "./seasonal-gacha.models";
import type { SeasonalGachaRepository } from "./seasonal-gacha.repository";

interface CatalogItem extends GachaPoolItem { firstSeen: string; }
interface ScheduledRun extends CalendarBannerWindow {
    slot: SeasonalGachaSlot;
    manual?: ManualSeasonalBannerConfig;
}

const ELEMENTS = [0, 1, 2, 3, 4, 5] as const;
const OFF_BANNER_TARGET: Record<3 | 4 | 5, number> = { 5: 5, 4: 10, 3: 10 };

function deterministicUnit(seed: string): number {
    return createHash("sha256").update(seed).digest().readUInt32BE(0) / 0x1_0000_0000;
}

function sample(ids: readonly number[], count: number, seed: string): number[] {
    return [...ids]
        .map((id) => ({ id, key: deterministicUnit(`${seed}:${id}`) }))
        .sort((a, b) => a.key - b.key || a.id - b.id)
        .slice(0, count)
        .map((entry) => entry.id);
}

export class SeasonalGachaService {
    readonly calendar: SeasonalGachaCalendar;
    private readonly items = new Map<SeasonalContentType, Map<number, CatalogItem>>();
    private readonly base: GachaDefinition;

    constructor(
        private readonly repository: SeasonalGachaRepository,
        private readonly catalog: GachaCatalog,
        private readonly characters: CharacterCatalog,
        private readonly config: GachaRotationConfig,
        private readonly clock: Clock,
    ) {
        this.calendar = new SeasonalGachaCalendar(config);
        const base = catalog.findById(config.shells.base);
        if (!base || base.type !== GachaType.CHARACTER) throw new InvariantError("Base gacha shell is missing or is not a character gacha.");
        this.base = base;
        const clientShellTime = new Date(config.clientShellTime).getTime();
        for (const slot of config.clientVisibleSlots) {
            const shell = catalog.findById(this.shellForSlot(slot));
            if (!shell) throw new InvariantError(`Client-visible gacha shell for ${slot} is missing.`);
            const startsAt = new Date(`${shell.startDate.replace(" ", "T")}Z`).getTime();
            const endsAt = new Date(`${shell.endDate.replace(" ", "T")}Z`).getTime();
            if (clientShellTime < startsAt || clientShellTime > endsAt) {
                throw new InvariantError(`clientShellTime is outside client-visible ${slot} shell window.`);
            }
        }
        this.items.set("character", this.collectItems(GachaType.CHARACTER));
        this.items.set("equipment", this.collectItems(GachaType.WEAPON));
    }

    ensureCurrentRotation(now = this.clock.now()): void {
        const anchor = new Date(this.config.epoch);
        if (now < anchor) return;
        const currentSeason = this.calendar.position(now).seasonNumber;
        for (let season = 1; season <= currentSeason; season += 1) {
            const runs = this.scheduledRuns(season)
                .filter((run) => run.startsAt <= now)
                .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || this.slotOrder(a.slot) - this.slotOrder(b.slot));
            for (const run of runs) this.materialize(season, run);
        }
    }

    resolve(shellGachaId: number, now = this.clock.now()): RuntimeGachaBanner | null {
        this.ensureCurrentRotation(now);
        return this.repository.findEnabledBannerByShell?.(now, shellGachaId) ?? null;
    }

    activeBanners(now = this.clock.now()): RuntimeGachaBanner[] {
        this.ensureCurrentRotation(now);
        return this.repository.listEnabledBanners?.(now) ?? [];
    }

    portalState(playerId: number, now = this.clock.now()): SeasonalGachaPortalState {
        const active = this.activeBanners(now);
        const visible = active.filter((banner) => this.config.clientVisibleSlots.includes(banner.slot as never));
        const anniversary = active.find((banner) => banner.slot === "anniversary");
        const key = anniversary ? `${this.runId(anniversary)}:${this.calendar.dayKey(now)}` : "";
        if (anniversary) this.repository.ensureEntitlement(playerId, key);
        return {
            shellGachaIds: visible.map((banner) => banner.shellGachaId),
            freeCampaignGachaIds: anniversary && visible.some((banner) => banner.slot === "anniversary") ? [anniversary.shellGachaId] : [],
            freeCampaignId: this.config.freeCampaignId,
            freeCampaignAvailable: anniversary !== undefined && this.repository.isEntitlementAvailable(playerId, key),
        };
    }

    consumeAnniversaryFreeSingle(playerId: number, shellGachaId: number, now = this.clock.now()): void {
        const banner = this.resolve(shellGachaId, now);
        if (!banner || banner.slot !== "anniversary") throw new InvalidRequestError("Anniversary free single is not active for this banner.");
        const key = `${this.runId(banner)}:${this.calendar.dayKey(now)}`;
        this.repository.ensureEntitlement(playerId, key);
        if (!this.repository.consumeEntitlement(playerId, key, now)) throw new InvalidRequestError("Today's Anniversary free single was already consumed.");
    }

    applyBaseFirstMultiGuarantee(playerId: number, gacha: GachaDefinition, drawIds: number[], now = this.clock.now()): number[] {
        const banner = this.resolve(gacha.id, now);
        if (!banner || banner.slot !== "base" || drawIds.length !== 10) return drawIds;
        if (!this.repository.consumeBaseFirstMulti(playerId, banner.seasonNumber, now)) return drawIds;
        const fiveStarIds = (gacha.pool[1] ?? []).map((entry) => entry.id);
        if (fiveStarIds.length === 0 || drawIds.some((id) => fiveStarIds.includes(id))) return drawIds;
        const replacement = fiveStarIds[Math.floor(deterministicUnit(`${playerId}:${banner.seasonNumber}:base-guarantee`) * fiveStarIds.length)];
        if (replacement === undefined) return drawIds;
        return [...drawIds.slice(0, -1), replacement];
    }

    baseSelectorPool(): number[] { return (this.base.pool[1] ?? []).map((entry) => entry.id); }

    consumeBaseSelector(playerId: number, characterId: number, now = this.clock.now()): { seasonNumber: number; price: number } {
        if (!this.baseSelectorPool().includes(characterId)) throw new InvalidRequestError("Character is not in the 15-unit Base selector pool.");
        const seasonNumber = this.calendar.position(now).seasonNumber;
        if (!this.repository.consumeBaseSelector(playerId, seasonNumber, characterId, now)) throw new InvalidRequestError("Base selector was already consumed this season.");
        return { seasonNumber, price: this.config.baseSelectorPrice };
    }

    private scheduledRuns(season: number): ScheduledRun[] {
        const regular = this.calendar.regularWindows(season).flatMap((window) => ([
            { ...window, slot: "base" as const }, { ...window, slot: "new" as const },
            { ...window, slot: "elemental" as const }, { ...window, slot: "weapon" as const },
        ]));
        const manual = [...this.config.manualSeasonalBanners]
            .sort((a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id))
            .map((banner, index) => ({
                cycleIndex: 60_000 + index,
                startsAt: new Date(banner.startAt),
                endsAt: new Date(banner.endAt),
                slot: "seasonal" as const,
                manual: banner,
            }))
            .filter((run) => this.calendar.position(run.startsAt).seasonNumber === season);
        return [
            ...regular,
            ...this.calendar.rerunWindows(season).map((window) => ({ ...window, slot: "rerun" as const })),
            ...this.calendar.meteorWindows(season),
            ...this.calendar.anniversaryWindows(season).map((window) => ({ ...window, slot: "anniversary" as const })),
            ...manual,
        ];
    }

    private materialize(season: number, run: ScheduledRun): void {
        if (this.repository.findBanner(season, run.cycleIndex, run.slot)) return;
        this.repository.transaction(() => {
            this.seedBaseRelease(season, run.startsAt);
            const featured = this.selectFeatured(season, run);
            if (run.slot === "new") this.repository.release("character", featured, season, run.cycleIndex, run.startsAt, "new");
            if ((run.slot === "meteor-1" || run.slot === "meteor-2") && this.overrideFor(season, run).featuredIds) {
                this.repository.release("character", featured, season, run.cycleIndex, run.startsAt, run.slot);
            }
            if (run.slot === "seasonal") this.repository.release("character", featured, season, run.cycleIndex, run.startsAt, "seasonal");
            const banner: RuntimeGachaBanner = {
                seasonNumber: season, cycleIndex: run.cycleIndex, slot: run.slot,
                shellGachaId: this.shellForRun(run), featuredIds: featured,
                festival: run.slot === "meteor-1" || run.slot === "meteor-2",
                startsAt: run.startsAt, endsAt: run.endsAt,
                definition: this.buildDefinition(season, run, featured),
            };
            this.repository.saveBanner(banner);
            if (featured.length > 0) this.repository.recordFeatured(run.slot === "weapon" ? "equipment" : "character", featured, run.slot, season, run.cycleIndex, run.startsAt);
        });
    }

    private seedBaseRelease(season: number, at: Date): void {
        if (this.repository.listReleased("character", season).length === 0) {
            this.repository.release("character", Object.values(this.base.pool).flat().map((item) => item.id), season, 0, at, "base");
        }
        if (this.repository.listReleased("equipment", season).length === 0) {
            this.repository.release("equipment", [...(this.items.get("equipment")?.keys() ?? [])], season, 0, at, "weapon");
        }
    }

    private selectFeatured(season: number, run: ScheduledRun): number[] {
        const characters = [...(this.items.get("character")?.values() ?? [])];
        const released = new Set(this.repository.listReleased("character", season));
        const seed = `${this.config.seed}:${season}:${run.cycleIndex}:${run.slot}`;
        if (run.slot === "seasonal") {
            if (!run.manual) throw new InvariantError("Manual Seasonal banner configuration is missing.");
            return Object.keys(run.manual.featuredRatesPercent).map(Number);
        }
        const configured = this.overrideFor(season, run).featuredIds;
        if (configured) {
            this.assertConfiguredFeatured(run.slot, configured, released);
            return [...configured];
        }
        if (run.slot === "new") {
            const unreleased = characters.filter((item) => !released.has(item.id) && (item.rank === 4 || item.rank === 5));
            const five = sample(unreleased.filter((item) => item.rank === 5).map((item) => item.id), 1, `${seed}:five`);
            const remainder = sample(unreleased.filter((item) => !five.includes(item.id)).map((item) => item.id), 2, `${seed}:rest`);
            if (five.length !== 1 || remainder.length !== 2) throw new InvariantError("New Faces catalog cannot provide three unreleased ★4/★5 units.");
            return [...five, ...remainder];
        }
        if (run.slot === "rerun") {
            const previous = new Set(this.previousRerunFeatured(season, run.cycleIndex));
            return ([5, 4, 3] as const).flatMap((rank) => sample(characters
                .filter((item) => item.rank === rank && released.has(item.id) && !previous.has(item.id))
                .map((item) => item.id), 3, `${seed}:${rank}`));
        }
        if (run.slot === "weapon") {
            return sample([...(this.items.get("equipment")?.values() ?? [])].filter((item) => item.rank === 5).map((item) => item.id), 1, seed);
        }
        return [];
    }

    private previousRerunFeatured(season: number, cycle: number): number[] {
        const history = this.repository.featureHistory("character", "rerun", season);
        const previousCycle = Math.max(-1, ...history.map((entry) => entry.lastGlobalCycle).filter((value) => value < cycle));
        return history.filter((entry) => entry.lastGlobalCycle === previousCycle).map((entry) => entry.contentId);
    }

    private buildDefinition(season: number, run: ScheduledRun, featured: number[]): GachaDefinition {
        const shell = this.catalog.findById(this.shellForRun(run));
        if (!shell) throw new InvariantError(`Gacha shell for ${run.slot} is missing.`);
        if (run.slot === "seasonal") return this.buildManualSeasonalDefinition(shell, run);
        if (run.slot === "base") return { ...this.base, startDate: run.startsAt.toISOString(), endDate: run.endsAt.toISOString() };
        const type: SeasonalContentType = run.slot === "weapon" ? "equipment" : "character";
        const released = new Set(this.repository.listReleased(type, season));
        const items = [...(this.items.get(type)?.values() ?? [])];
        let candidates: CatalogItem[];
        const configuredPool = this.overrideFor(season, run).poolIds;
        if (configuredPool) {
            if (featured.some((id) => !configuredPool.includes(id))) {
                throw new InvariantError(`Configured ${run.slot} pool must include every configured featured unit.`);
            }
            const allowed = new Set(configuredPool);
            candidates = items.filter((item) => allowed.has(item.id));
        } else if (run.slot === "weapon") candidates = items;
        else if (run.slot === "elemental") {
            const element = ELEMENTS[run.cycleIndex % ELEMENTS.length];
            candidates = items.filter((item) => released.has(item.id) && this.characters.findById(item.id)?.element === element);
        } else if (run.slot === "anniversary" || run.slot === "meteor-1" || run.slot === "meteor-2") {
            candidates = items.filter((item) => released.has(item.id));
        } else {
            candidates = this.cappedOffBanner(items, released, new Set(featured), `${this.config.seed}:${season}:${run.cycleIndex}:${run.slot}`)
                .concat(items.filter((item) => featured.includes(item.id)));
        }
        const selections: GachaPoolSelection[] = candidates
            .filter((item) => item.rank === 5 || item.rank === 4 || item.rank === 3)
            .map((item) => ({ id: item.id, rank: item.rank as 5 | 4 | 3, featured: featured.includes(item.id) }));
        const festival = run.slot === "meteor-1" || run.slot === "meteor-2";
        const configuredRates = festival ? this.config.ratePolicies.meteorFestival : this.config.ratePolicies.normal;
        return applyGachaPoolPolicy({ ...shell, startDate: run.startsAt.toISOString(), endDate: run.endsAt.toISOString(), ...(festival ? { movieName: "fes", guaranteeMovieName: "fes_guarantee" } : {}) }, selections, festival, configuredRates);
    }

    private cappedOffBanner(items: CatalogItem[], released: Set<number>, featured: Set<number>, seed: string): CatalogItem[] {
        const selected = new Set<number>();
        for (const rank of [5, 4, 3] as const) for (const element of ELEMENTS) {
            const ids = items.filter((item) => item.rank === rank && released.has(item.id) && !featured.has(item.id) && this.characters.findById(item.id)?.element === element).map((item) => item.id);
            sample(ids, OFF_BANNER_TARGET[rank], `${seed}:${rank}:${element}`).forEach((id) => selected.add(id));
        }
        return items.filter((item) => selected.has(item.id));
    }

    private collectItems(type: GachaType): Map<number, CatalogItem> {
        const result = new Map<number, CatalogItem>();
        const cutoff = new Date(this.config.sourceCutoffAt).getTime();
        for (const gacha of this.catalog.listAll().filter((entry) => {
            const sourceStart = new Date(`${entry.startDate.replace(" ", "T")}Z`).getTime();
            return entry.type === type && !this.config.excludedGachaIds.includes(entry.id) && Number.isFinite(sourceStart) && sourceStart <= cutoff;
        })) for (const item of Object.values(gacha.pool).flat()) {
            const previous = result.get(item.id);
            if (!previous || gacha.startDate < previous.firstSeen) result.set(item.id, { ...item, firstSeen: gacha.startDate });
        }
        return result;
    }

    private buildManualSeasonalDefinition(shell: GachaDefinition, run: ScheduledRun): GachaDefinition {
        const manual = run.manual;
        if (!manual) throw new InvariantError("Manual Seasonal banner configuration is missing.");
        if (shell.type !== GachaType.CHARACTER) throw new InvariantError(`Manual Seasonal shell ${manual.shellGachaId} must be a character gacha.`);

        const featuredRates = new Map(Object.entries(manual.featuredRatesPercent).map(([id, rate]) => [Number(id), rate]));
        if ([...featuredRates.keys()].some((id) => !manual.poolIds.includes(id))) {
            throw new InvariantError(`Manual Seasonal banner '${manual.id}' has a featured unit outside poolIds.`);
        }

        const pool: Record<number, GachaPoolItem[]> = { 1: [], 2: [], 3: [] };
        const rankWeights: [number, number, number] = [0, 0, 0];
        for (const [index, rank] of ([5, 4, 3] as const).entries()) {
            const ids = manual.poolIds.filter((id) => this.characters.findById(id)?.rarity === rank);
            if (ids.length === 0) throw new InvariantError(`Manual Seasonal banner '${manual.id}' has no ★${rank} unit.`);
            const totalRate = manual.rankRatesPercent[String(rank) as "5" | "4" | "3"];
            const featured = ids.filter((id) => featuredRates.has(id));
            const normal = ids.filter((id) => !featuredRates.has(id));
            const featuredTotal = featured.reduce((sum, id) => sum + (featuredRates.get(id) ?? 0), 0);
            const remaining = totalRate - featuredTotal;
            if (remaining < -1e-8 || (normal.length === 0 && Math.abs(remaining) > 1e-8)) {
                throw new InvariantError(`Manual Seasonal banner '${manual.id}' has invalid ★${rank} featured rates.`);
            }
            const normalRate = normal.length === 0 ? 0 : remaining / normal.length;
            if (normalRate <= 0 && normal.length > 0) throw new InvariantError(`Manual Seasonal banner '${manual.id}' leaves no ★${rank} off-banner rate.`);
            pool[index + 1] = ids.map((id) => {
                const rate = featuredRates.get(id) ?? normalRate;
                return { id, rank, odds: Math.round(rate * 100_000) / 1_000, isRateUp: featuredRates.has(id), weight: Math.max(1, Math.round(rate * 1_000_000)) };
            });
            rankWeights[index] = Math.round(totalRate * 100);
        }

        const known = new Set(this.characters.listAll().map((entry) => entry.id));
        const unknown = manual.poolIds.filter((id) => !known.has(id));
        if (unknown.length > 0) throw new InvariantError(`Manual Seasonal banner '${manual.id}' contains unknown character IDs: ${unknown.join(", ")}.`);
        return {
            ...shell,
            startDate: run.startsAt.toISOString(),
            endDate: run.endsAt.toISOString(),
            pool,
            rankWeights,
            ...(manual.multiGuaranteeMinimumRank === undefined ? {} : { multiGuaranteeMinimumRank: manual.multiGuaranteeMinimumRank }),
        };
    }

    private overrideFor(season: number, run: ScheduledRun): { featuredIds?: number[]; poolIds?: number[] } {
        return this.config.runOverrides[`${season}:${run.cycleIndex}:${run.slot}`] ?? {};
    }

    private assertConfiguredFeatured(slot: SeasonalGachaSlot, ids: number[], released: Set<number>): void {
        if (new Set(ids).size !== ids.length) throw new InvariantError(`Configured ${slot} featured IDs contain duplicates.`);
        if (slot === "new") {
            const definitions = ids.map((id) => this.characters.findById(id));
            if (ids.length !== 3 || definitions.some((entry) => !entry || (entry.rarity !== 4 && entry.rarity !== 5))
                || !definitions.some((entry) => entry?.rarity === 5) || ids.some((id) => released.has(id))) {
                throw new InvariantError("Configured New Faces must contain three unreleased ★4/★5 units including at least one ★5.");
            }
        }
        if (slot === "rerun") {
            const counts = [5, 4, 3].map((rank) => ids.filter((id) => this.characters.findById(id)?.rarity === rank).length);
            if (ids.length !== 9 || counts.some((count) => count !== 3) || ids.some((id) => !released.has(id))) {
                throw new InvariantError("Configured Rerun must contain 3×★5, 3×★4 and 3×★3 released units.");
            }
        }
    }

    private shellForSlot(slot: SeasonalGachaSlot): number {
        if (slot === "base") return this.config.shells.base;
        if (slot === "new") return this.config.shells.new;
        if (slot === "rerun") return this.config.shells.rerun;
        if (slot === "elemental") return this.config.shells.elemental;
        if (slot === "weapon") return this.config.shells.weapon;
        if (slot === "meteor-1") return this.config.shells.meteor1;
        if (slot === "meteor-2") return this.config.shells.meteor2;
        return this.config.shells.anniversary;
    }

    private shellForRun(run: ScheduledRun): number {
        return run.manual?.shellGachaId ?? this.shellForSlot(run.slot);
    }

    private slotOrder(slot: SeasonalGachaSlot): number { return ["base", "new", "elemental", "weapon", "rerun", "meteor-1", "meteor-2", "anniversary"].indexOf(slot); }
    private runId(banner: RuntimeGachaBanner): string { return `${banner.seasonNumber}:${banner.cycleIndex}:${banner.slot}`; }
}
