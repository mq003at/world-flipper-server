import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { JsonGachaCatalog } from "../src/content/master-data/json-gacha-catalog";
import { applyGachaPortalState } from "../src/modules/bootstrap/game-bootstrap.service";
import type { Clock } from "../src/infrastructure/clock/clock";
import { loadGachaRotationConfig } from "../src/modules/gacha/gacha-rotation.config";
import { SeasonalGachaCalendar } from "../src/modules/gacha/seasonal-gacha-calendar";
import type { RuntimeGachaBanner, SeasonalContentType, SeasonalGachaSlot } from "../src/modules/gacha/seasonal-gacha.models";
import type { FeatureHistoryEntry, SeasonalGachaRepository } from "../src/modules/gacha/seasonal-gacha.repository";
import { SeasonalGachaService } from "../src/modules/gacha/seasonal-gacha.service";

const liveDir = path.resolve("content/live");
const masterDir = path.resolve("content/master");
const config = loadGachaRotationConfig(liveDir);

class FixedClock implements Clock {
    constructor(private readonly value: Date) {}
    now(): Date { return new Date(this.value); }
}

class MemorySeasonalRepository implements SeasonalGachaRepository {
    readonly banners = new Map<string, RuntimeGachaBanner>();
    private readonly released = new Map<SeasonalContentType, Set<number>>();
    private readonly history: Array<{ type: SeasonalContentType; id: number; slot: SeasonalGachaSlot; cycle: number }> = [];
    private readonly entitlements = new Map<string, boolean>();
    private key(season: number, cycle: number, slot: SeasonalGachaSlot): string { return `${season}:${cycle}:${slot}`; }
    findBanner(season: number, cycle: number, slot: SeasonalGachaSlot): RuntimeGachaBanner | null { return this.banners.get(this.key(season, cycle, slot)) ?? null; }
    saveBanner(banner: RuntimeGachaBanner): void { this.banners.set(this.key(banner.seasonNumber, banner.cycleIndex, banner.slot), banner); }
    listReleased(type: SeasonalContentType): number[] { return [...(this.released.get(type) ?? [])]; }
    release(type: SeasonalContentType, ids: readonly number[]): void { const set = this.released.get(type) ?? new Set<number>(); ids.forEach((id) => set.add(id)); this.released.set(type, set); }
    featureHistory(type: SeasonalContentType, slot: SeasonalGachaSlot): FeatureHistoryEntry[] {
        const latest = new Map<number, number>();
        this.history.filter((row) => row.type === type && row.slot === slot).forEach((row) => latest.set(row.id, Math.max(latest.get(row.id) ?? -1, row.cycle)));
        return [...latest].map(([contentId, lastGlobalCycle]) => ({ contentId, lastGlobalCycle }));
    }
    recordFeatured(type: SeasonalContentType, ids: readonly number[], slot: SeasonalGachaSlot, cycle: number): void { ids.forEach((id) => this.history.push({ type, id, slot, cycle })); }
    ensureEntitlement(playerId: number, day: string): void { const key = `${playerId}:${day}`; if (!this.entitlements.has(key)) this.entitlements.set(key, true); }
    isEntitlementAvailable(playerId: number, day: string): boolean { return this.entitlements.get(`${playerId}:${day}`) === true; }
    consumeEntitlement(playerId: number, day: string): boolean { const key = `${playerId}:${day}`; if (this.entitlements.get(key) !== true) return false; this.entitlements.set(key, false); return true; }
    transaction<T>(work: () => T): T { return work(); }
}

test("season boundaries use three calendar months and truncate the final cycle", () => {
    const calendar = new SeasonalGachaCalendar(config);
    const feb = calendar.position(new Date("2026-02-28T12:00:00+07:00"));
    assert.equal(feb.seasonNumber, 1);
    assert.equal(feb.seasonEndExclusive.toISOString(), "2026-03-31T17:00:00.000Z");

    const final = calendar.position(new Date("2026-03-31T12:00:00+07:00"));
    assert.equal(final.cycleEndExclusive.toISOString(), final.seasonEndExclusive.toISOString());
    assert.ok(final.cycleEndExclusive.getTime() - final.cycleStart.getTime() <= 3 * 86_400_000);

    const next = calendar.position(new Date("2026-04-01T00:00:00+07:00"));
    assert.equal(next.seasonNumber, 2);
    assert.equal(next.cycleIndex, 0);
});

test("rotation is persisted, idempotent, and resolves the three frozen shells", () => {
    const repository = new MemorySeasonalRepository();
    const clock = new FixedClock(new Date("2026-09-07T12:00:00+07:00"));
    const service = new SeasonalGachaService(repository, new JsonGachaCatalog(masterDir), config, clock);

    service.ensureCurrentRotation();
    const before = repository.banners.size;
    service.ensureCurrentRotation();
    const after = repository.banners.size;
    assert.equal(after, before);

    const runtime = [config.shells.new, config.shells.rerun, config.shells.weapon]
        .map((id) => service.resolve(id));
    assert.ok(runtime.every((banner) => banner !== null));
    assert.equal(runtime[0]?.definition.rankWeights?.[0], runtime[0]?.festival ? 750 : 500);
    assert.equal(runtime[0]?.definition.id, config.shells.new);
    const featured = runtime[0]?.definition.pool[1].filter((item) => item.isRateUp) ?? [];
    const expectedFeaturedRate = [0, 1.5, 1.0, 0.7, 0.5, 0.4][featured.length];
    const fiveStarRate = (runtime[0]?.definition.rankWeights?.[0] ?? 0) / 100;
    const poolWeight = runtime[0]?.definition.pool[1].reduce((sum, item) => sum + item.weight, 0) ?? 1;
    for (const item of featured) {
        const actual = fiveStarRate * item.weight / poolWeight;
        assert.ok(Math.abs(actual - (expectedFeaturedRate ?? 0)) < 0.001);
    }
});

test("month-end free x10 entitlement is shared by NEW and RERUN", () => {
    const repository = new MemorySeasonalRepository();
    const clock = new FixedClock(new Date("2026-02-27T12:00:00+07:00"));
    const service = new SeasonalGachaService(repository, new JsonGachaCatalog(masterDir), config, clock);
    service.ensureCurrentRotation();
    assert.equal(service.portalState(99).freeCampaignAvailable, true);
    service.consumeDailyFree(99, config.shells.new);
    assert.equal(service.portalState(99).freeCampaignAvailable, false);
    assert.throws(() => service.consumeDailyFree(99, config.shells.rerun));
    assert.throws(() => service.consumeDailyFree(99, config.shells.weapon));
    assert.equal(new SeasonalGachaCalendar(config).isMonthEndCampaign(
        new Date("2028-02-28T12:00:00+07:00"),
    ), true);
});

test("load snapshot advertises all three shells so Portal can open", () => {
    const snapshot = {
        player: { id: 1 },
        gachaInfoList: [],
        gachaCampaignList: [],
    } as any;
    applyGachaPortalState(snapshot, {
        shellGachaIds: [157, 155, 5033],
        freeCampaignId: 19,
        freeCampaignAvailable: true,
    });
    assert.deepEqual(snapshot.gachaInfoList.map((entry: any) => entry.gachaId), [157, 155, 5033]);
    assert.deepEqual(snapshot.gachaCampaignList.map((entry: any) => entry.gachaId), [157, 155]);
});
