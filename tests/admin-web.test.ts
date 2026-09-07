import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import Fastify from "fastify";
import { AdjustableSystemClock } from "../src/infrastructure/clock/adjustable-system-clock";
import { createAdminWebRoutes } from "../src/modules/admin-web/admin-web.routes";

function createFixture(importEnabled = true) {
    const clock = new AdjustableSystemClock();
    clock.set(new Date("2026-09-07T05:00:00Z"));
    const gachaBanner = {
        seasonNumber: 3, cycleIndex: 22, slot: "new", shellGachaId: 157, featuredIds: [151006],
        festival: false, startsAt: new Date("2026-09-04T17:00:00Z"), endsAt: new Date("2026-09-13T17:00:00Z"),
        enabled: true, artworkPath: null,
        definition: {
            id: 157, type: 0, paymentType: 0, singleCost: 150, multiCost: 1500, discountCost: 0,
            startDate: "2026-09-04T17:00:00Z", endDate: "2026-09-13T17:00:00Z", rankWeights: [500, 2500, 7000],
            pool: {
                1: [{ id: 151006, rank: 5, odds: 500, isRateUp: true, weight: 1 }],
                2: [{ id: 241001, rank: 4, odds: 2500, isRateUp: false, weight: 1 }],
                3: [{ id: 341001, rank: 3, odds: 7000, isRateUp: false, weight: 1 }],
            },
        },
    };
    const repository = {
        listPlayers: () => [{ id: 2, name: "Test <Player>", comment: "Hello", lastLoginTime: new Date("2026-09-07T00:00:00Z"), paidVmoney: 10, freeVmoney: 20 }],
        findPlayer: (id: number) => id === 2
            ? { id: 2, name: "Test <Player>", comment: "Hello", lastLoginTime: new Date("2026-09-07T00:00:00Z"), paidVmoney: 10, freeVmoney: 20 }
            : null,
        updateBeads: (id: number, currency: string, operation: string, amount: number) => id === 2
            ? {
                id: 2, name: "Test", comment: "Hello", lastLoginTime: new Date(),
                paidVmoney: currency === "paid" ? (operation === "set" ? amount : 10 + amount) : 10,
                freeVmoney: currency === "free" ? (operation === "set" ? amount : 20 + amount) : 20,
            }
            : null,
        listCurrentGachas: () => [gachaBanner],
        findGacha: () => gachaBanner,
        setGachaEnabled: (_season: number, _cycle: number, _slot: string, enabled: boolean) => ({ ...gachaBanner, enabled }),
        updateGachaDefinition: (_season: number, _cycle: number, _slot: string, definition: any, featuredIds: number[]) => ({ ...gachaBanner, definition, featuredIds }),
        setGachaArtwork: (_season: number, _cycle: number, _slot: string, artworkPath: string | null) => ({ ...gachaBanner, artworkPath }),
    } as any;
    const playerData = {
        exportPlayer: (id: number) => ({ format: "world-flipper-server-player-save", version: 1, player: { id } }),
        importPlayer: (id: number) => ({ playerId: id, importedSections: 2, importedRows: 5, replaced: true }),
    } as any;
    const gachaProbability = {
        activeManifest: () => ({ generatedAt: clock.now().toISOString(), banners: [] }),
        presentBanner: (banner: any) => ({
            seasonNumber: banner.seasonNumber, cycleIndex: banner.cycleIndex, slot: banner.slot, shellGachaId: banner.shellGachaId,
            festival: banner.festival, startsAt: banner.startsAt.toISOString(), endsAt: banner.endsAt.toISOString(),
            rarityRatesPercent: { "5": 5, "4": 25, "3": 70 }, featuredIds: banner.featuredIds,
            entries: [
                { id: 151006, name: "Featured Unit", contentType: "character", rarity: 5, featured: true, ratePercent: 5 },
                { id: 241001, name: "Four Star", contentType: "character", rarity: 4, featured: false, ratePercent: 25 },
                { id: 341001, name: "Three Star", contentType: "character", rarity: 3, featured: false, ratePercent: 70 },
            ],
        }),
    } as any;
    const app = Fastify();
    return { app, clock, plugin: createAdminWebRoutes(repository, playerData, gachaProbability, clock, {
        webDir: path.resolve("web"), importEnabled, adjustableClock: clock,
    }) };
}

test("admin web renders extracted pages and escapes player data", async () => {
    const { app, plugin } = createFixture();
    await app.register(plugin);
    const dashboard = await app.inject({ method: "GET", url: "/" });
    assert.equal(dashboard.statusCode, 200);
    assert.match(dashboard.body, /\/web_api\/server\/time/);
    const players = await app.inject({ method: "GET", url: "/player" });
    assert.equal(players.statusCode, 200);
    assert.match(players.body, /Test &lt;Player&gt;/);
    const detail = await app.inject({ method: "GET", url: "/player/2" });
    assert.match(detail.body, /\/web_api\/player\/2\/save/);
    assert.match(detail.body, /id="bead-form" data-player-id="2"/);
    assert.match(detail.body, /\/web_api\/player\/\$\{form\.dataset\.playerId\}\/beads/);
    await app.close();
});

test("admin web updates paid or free beads without a store checkout", async () => {
    const { app, plugin } = createFixture();
    await app.register(plugin);
    const response = await app.inject({
        method: "POST",
        url: "/web_api/player/2/beads",
        payload: { currency: "free", operation: "add", amount: 1500 },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().free_vmoney, 1520);
    const invalid = await app.inject({
        method: "POST",
        url: "/web_api/player/2/beads",
        payload: { currency: "free", operation: "set", amount: -1 },
    });
    assert.equal(invalid.statusCode, 400);
    await app.close();
});

test("admin save endpoints use the portable player-data service", async () => {
    const { app, plugin } = createFixture();
    await app.register(plugin);
    const exported = await app.inject({ method: "GET", url: "/web_api/player/2/save" });
    assert.equal(exported.statusCode, 200);
    assert.match(exported.headers["content-disposition"] ?? "", /starpoint-player-2\.json/);
    assert.equal(exported.json().format, "world-flipper-server-player-save");
    const imported = await app.inject({ method: "PUT", url: "/web_api/player/2/save", payload: { any: "save" } });
    assert.equal(imported.statusCode, 200);
    assert.equal(imported.json().summary.importedRows, 5);
    await app.close();
});

test("admin import respects the trusted-server feature flag", async () => {
    const { app, plugin } = createFixture(false);
    await app.register(plugin);
    const response = await app.inject({ method: "PUT", url: "/web_api/player/2/save", payload: {} });
    assert.equal(response.statusCode, 403);
    await app.close();
});

test("admin gacha page renders probability list and pool editor", async () => {
    const { app, plugin } = createFixture();
    await app.register(plugin);
    const list = await app.inject({ method: "GET", url: "/gacha" });
    assert.equal(list.statusCode, 200);
    assert.match(list.body, /Featured Unit/);
    assert.match(list.body, /Add Gacha/);
    assert.match(list.body, /5★ <strong>5%/);
    const detail = await app.inject({ method: "GET", url: "/gacha/3/22/new" });
    assert.equal(detail.statusCode, 200);
    assert.match(detail.body, /NEW probability list/);
    assert.match(detail.body, /Featured Unit/);
    assert.match(detail.body, /Attach artwork/);
    await app.close();
});

test("admin clock changes runtime time and reset restores wall time", async () => {
    const { app, clock, plugin } = createFixture();
    await app.register(plugin);
    const changed = await app.inject({ method: "GET", url: "/web_api/server/time?time=2030-01-02T03%3A04" });
    assert.equal(changed.statusCode, 302);
    assert.ok(Math.abs(clock.now().getTime() - new Date("2030-01-02T03:04:00Z").getTime()) < 1_000);
    const reset = await app.inject({ method: "GET", url: "/web_api/server/reset-time" });
    assert.equal(reset.statusCode, 302);
    assert.ok(Math.abs(clock.now().getTime() - Date.now()) < 1_000);
    await app.close();
});
