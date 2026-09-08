import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { JsonCharacterCatalog } from "../src/content/master-data/json-character-catalog";
import { JsonGachaCatalog } from "../src/content/master-data/json-gacha-catalog";
import type { Clock } from "../src/infrastructure/clock/clock";
import { applyGachaPortalState } from "../src/modules/bootstrap/game-bootstrap.service";
import { loadGachaRotationConfig } from "../src/modules/gacha/gacha-rotation.config";
import { SeasonalGachaCalendar } from "../src/modules/gacha/seasonal-gacha-calendar";
import { SeasonalGachaService } from "../src/modules/gacha/seasonal-gacha.service";
import type { RuntimeGachaBanner, RuntimeGachaSlot, SeasonalContentType, SeasonalGachaSlot } from "../src/modules/gacha/seasonal-gacha.models";
import type { FeatureHistoryEntry, SeasonalGachaRepository } from "../src/modules/gacha/seasonal-gacha.repository";

const masterDir = path.resolve("content/master");
const config = loadGachaRotationConfig(path.resolve("content/live"));
class FixedClock implements Clock { constructor(private readonly value: Date) {} now(): Date { return new Date(this.value); } }

class MemoryRepository implements SeasonalGachaRepository {
    readonly banners = new Map<string, RuntimeGachaBanner>();
    readonly released = new Map<string, Set<number>>();
    readonly history: Array<{ type: SeasonalContentType; id: number; slot: SeasonalGachaSlot; cycle: number; season: number }> = [];
    readonly entitlements = new Map<string, boolean>();
    readonly baseMulti = new Set<string>();
    readonly selector = new Set<string>();
    key(season: number, cycle: number, slot: RuntimeGachaSlot) { return `${season}:${cycle}:${slot}`; }
    findBanner(season: number, cycle: number, slot: RuntimeGachaSlot) { return this.banners.get(this.key(season, cycle, slot)) ?? null; }
    saveBanner(banner: RuntimeGachaBanner) { this.banners.set(this.key(banner.seasonNumber, banner.cycleIndex, banner.slot), banner); }
    findEnabledBannerByShell(at: Date, shell: number) { return [...this.banners.values()].find((banner) => banner.shellGachaId === shell && banner.startsAt <= at && banner.endsAt > at) ?? null; }
    listEnabledBanners(at: Date) { return [...this.banners.values()].filter((banner) => banner.startsAt <= at && banner.endsAt > at); }
    listReleased(type: SeasonalContentType, season: number) { return [...(this.released.get(`${season}:${type}`) ?? [])]; }
    release(type: SeasonalContentType, ids: readonly number[], season: number) { const key = `${season}:${type}`; const set = this.released.get(key) ?? new Set<number>(); ids.forEach((id) => set.add(id)); this.released.set(key, set); }
    featureHistory(type: SeasonalContentType, slot: SeasonalGachaSlot, season: number): FeatureHistoryEntry[] {
        const latest = new Map<number, number>();
        this.history.filter((row) => row.type === type && row.slot === slot && row.season === season).forEach((row) => latest.set(row.id, Math.max(latest.get(row.id) ?? -1, row.cycle)));
        return [...latest].map(([contentId, lastGlobalCycle]) => ({ contentId, lastGlobalCycle }));
    }
    recordFeatured(type: SeasonalContentType, ids: readonly number[], slot: SeasonalGachaSlot, _season: number, cycle: number, at: Date) {
        const season = new SeasonalGachaCalendar(config).position(at).seasonNumber;
        ids.forEach((id) => this.history.push({ type, id, slot, cycle, season }));
    }
    ensureEntitlement(player: number, day: string) { const key = `${player}:${day}`; if (!this.entitlements.has(key)) this.entitlements.set(key, true); }
    isEntitlementAvailable(player: number, day: string) { return this.entitlements.get(`${player}:${day}`) === true; }
    consumeEntitlement(player: number, day: string) { const key = `${player}:${day}`; if (!this.entitlements.get(key)) return false; this.entitlements.set(key, false); return true; }
    consumeBaseFirstMulti(player: number, season: number) { const key = `${player}:${season}`; if (this.baseMulti.has(key)) return false; this.baseMulti.add(key); return true; }
    consumeBaseSelector(player: number, season: number) { const key = `${player}:${season}`; if (this.selector.has(key)) return false; this.selector.add(key); return true; }
    transaction<T>(work: () => T) { return work(); }
}

function fixture(iso: string) {
    const repository = new MemoryRepository();
    const clock = new FixedClock(new Date(iso));
    const characters = new JsonCharacterCatalog(masterDir);
    const service = new SeasonalGachaService(repository, new JsonGachaCatalog(masterDir), characters, config, clock);
    return { repository, service, characters };
}

test("season is six months and monthly remainder extends the final run", () => {
    const calendar = new SeasonalGachaCalendar(config);
    const position = calendar.position(new Date("2026-06-30T12:00:00+07:00"));
    assert.equal(position.seasonNumber, 1);
    assert.equal(position.seasonEndExclusive.toISOString(), "2026-06-30T17:00:00.000Z");
    const january = calendar.regularWindows(1).filter((window) => window.startsAt < new Date("2026-02-01T00:00:00+07:00"));
    assert.deepEqual(january.map((window) => (window.endsAt.getTime() - window.startsAt.getTime()) / 86_400_000), [7, 7, 7, 10]);
    assert.ok(calendar.regularWindows(1).every((window) => window.endsAt.getTime() - window.startsAt.getTime() <= 13 * 86_400_000));
    assert.equal(calendar.position(new Date("2026-07-01T00:00:00+07:00")).seasonNumber, 2);
});

test("Rerun begins exactly on season day 21", () => {
    const calendar = new SeasonalGachaCalendar(config);
    const rerun = calendar.rerunWindows(1)[0];
    assert.equal(rerun?.startsAt.toISOString(), "2026-01-20T17:00:00.000Z");
    assert.equal(calendar.dayOfSeason(new Date("2026-01-21T00:00:00+07:00")), 21);
});

test("two Meteor runs occupy the final 14 days and Anniversary overlaps run two", () => {
    const calendar = new SeasonalGachaCalendar(config);
    const meteor = calendar.meteorWindows(1).slice(0, 2);
    const anniversary = calendar.anniversaryWindows(1)[0];
    assert.equal(meteor[0]?.startsAt.toISOString(), "2026-01-17T17:00:00.000Z");
    assert.equal(meteor[1]?.startsAt.toISOString(), "2026-01-24T17:00:00.000Z");
    assert.equal(anniversary?.startsAt.toISOString(), meteor[1]?.startsAt.toISOString());
    assert.equal(anniversary?.endsAt.toISOString(), meteor[1]?.endsAt.toISOString());
});

test("rotation persists five regular banners, exact New Faces composition, and client-safe shells", () => {
    const { repository, service, characters } = fixture("2026-09-07T12:00:00+07:00");
    service.ensureCurrentRotation();
    const count = repository.banners.size;
    service.ensureCurrentRotation();
    assert.equal(repository.banners.size, count);

    const active = service.activeBanners();
    for (const slot of ["base", "new", "elemental", "weapon", "rerun"]) assert.ok(active.some((banner) => banner.slot === slot), slot);
    const newest = active.find((banner) => banner.slot === "new");
    assert.equal(newest?.featuredIds.length, 3);
    assert.ok((newest?.featuredIds ?? []).some((id) => characters.findById(id)?.rarity === 5));
    assert.ok((newest?.featuredIds ?? []).every((id) => (characters.findById(id)?.rarity ?? 0) >= 4));

    const portal = service.portalState(999);
    assert.deepEqual(portal.shellGachaIds.sort((a, b) => a - b), [155, 157, 5033]);
    assert.equal(repository.listReleased("character", 1).some((id) => repository.listReleased("character", 2).includes(id)), true);
});

test("Elemental pools contain one canonical element and Rerun avoids immediate repeats", () => {
    const { repository, service, characters } = fixture("2026-09-07T12:00:00+07:00");
    service.ensureCurrentRotation();
    const elemental = service.activeBanners().find((banner) => banner.slot === "elemental");
    const elements = new Set(Object.values(elemental?.definition.pool ?? {}).flat().map((item) => characters.findById(item.id)?.element));
    assert.equal(elements.size, 1);

    const reruns = [...repository.banners.values()].filter((banner) => banner.seasonNumber === 2 && banner.slot === "rerun").sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime()).slice(0, 2);
    assert.equal(reruns.length, 2);
    const latest = new Set(reruns[0]!.featuredIds);
    const previous = reruns[1]!.featuredIds;
    assert.ok(previous.every((id) => !latest.has(id)));
});

test("Base first multi and selector entitlements are once per player per season", () => {
    const { service } = fixture("2026-09-07T12:00:00+07:00");
    service.ensureCurrentRotation();
    const base = service.activeBanners().find((banner) => banner.slot === "base")!;
    const noFive = Array(10).fill(base.definition.pool[3][0]!.id) as number[];
    const guaranteed = service.applyBaseFirstMultiGuarantee(1, base.definition, noFive);
    assert.ok(base.definition.pool[1].some((item) => item.id === guaranteed[9]));
    assert.deepEqual(service.applyBaseFirstMultiGuarantee(1, base.definition, noFive), noFive);
    const selected = service.baseSelectorPool()[0]!;
    assert.equal(service.consumeBaseSelector(1, selected).seasonNumber, 2);
    assert.throws(() => service.consumeBaseSelector(1, selected));
});

test("run override fixes featured IDs while an absent override remains deterministic", () => {
    const catalog = new JsonGachaCatalog(masterDir);
    const characters = new JsonCharacterCatalog(masterDir);
    const baseIds = new Set(Object.values(catalog.findById(1)!.pool).flat().map((item) => item.id));
    const five = characters.listAll().find((entry) => entry.rarity === 5 && !baseIds.has(entry.id))!;
    const fours = characters.listAll().filter((entry) => entry.rarity === 4 && !baseIds.has(entry.id)).slice(0, 2);
    const featured = [five.id, ...fours.map((entry) => entry.id)];
    const overridden = { ...config, runOverrides: { "1:0:new": { featuredIds: featured } } };
    const repository = new MemoryRepository();
    const clock = new FixedClock(new Date("2026-01-02T12:00:00+07:00"));
    const service = new SeasonalGachaService(repository, catalog, characters, overridden, clock);
    service.ensureCurrentRotation();
    assert.deepEqual(service.activeBanners().find((banner) => banner.slot === "new")?.featuredIds, featured);
});

test("manual Seasonal banner uses configured dates, exact rates, pool, release and guarantee", () => {
    const catalog = new JsonGachaCatalog(masterDir);
    const characters = new JsonCharacterCatalog(masterDir);
    const baseIds = new Set(Object.values(catalog.findById(1)!.pool).flat().map((item) => item.id));
    const byRank = (rank: number) => characters.listAll().filter((entry) => entry.rarity === rank).slice(0, 3).map((entry) => entry.id);
    const featured = characters.listAll().find((entry) => entry.rarity === 5 && !baseIds.has(entry.id))!.id;
    const poolIds = [...new Set([featured, ...byRank(5), ...byRank(4), ...byRank(3)])];
    const seasonalConfig = {
        ...config,
        manualSeasonalBanners: [{
            id: "summer-1",
            shellGachaId: 157,
            startAt: "2026-01-02T00:00:00+07:00",
            endAt: "2026-01-09T00:00:00+07:00",
            poolIds,
            featuredRatesPercent: { [String(featured)]: 1.5 },
            rankRatesPercent: { "5": 7.5, "4": 25, "3": 67.5 },
            multiGuaranteeMinimumRank: 5 as const,
        }],
    };
    const repository = new MemoryRepository();
    const service = new SeasonalGachaService(repository, catalog, characters, seasonalConfig, new FixedClock(new Date("2026-01-03T00:00:00+07:00")));
    service.ensureCurrentRotation();
    const banner = service.activeBanners().find((entry) => entry.slot === "seasonal")!;
    assert.deepEqual(banner.featuredIds, [featured]);
    assert.deepEqual(banner.definition.rankWeights, [750, 2500, 6750]);
    assert.equal(banner.definition.multiGuaranteeMinimumRank, 5);
    assert.deepEqual(Object.values(banner.definition.pool).flat().map((item) => item.id).sort((a, b) => a - b), [...poolIds].sort((a, b) => a - b));
    assert.ok(repository.listReleased("character", 1).includes(featured));
});

test("load snapshot advertises the configured frozen client shells", () => {
    const snapshot = { player: { id: 1 }, gachaInfoList: [], gachaCampaignList: [] } as any;
    applyGachaPortalState(snapshot, { shellGachaIds: [157, 155, 5033], freeCampaignId: 19, freeCampaignAvailable: false });
    assert.deepEqual(snapshot.gachaInfoList.map((entry: any) => entry.gachaId), [157, 155, 5033]);
});
