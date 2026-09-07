import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import Fastify from "fastify";
import { AdjustableSystemClock } from "../src/infrastructure/clock/adjustable-system-clock";
import { createAdminWebRoutes } from "../src/modules/admin-web/admin-web.routes";

function createFixture(importEnabled = true) {
    const clock = new AdjustableSystemClock();
    const repository = {
        listPlayers: () => [{ id: 2, name: "Test <Player>", comment: "Hello", lastLoginTime: new Date("2026-09-07T00:00:00Z") }],
        findPlayer: (id: number) => id === 2
            ? { id: 2, name: "Test <Player>", comment: "Hello", lastLoginTime: new Date("2026-09-07T00:00:00Z") }
            : null,
    } as any;
    const playerData = {
        exportPlayer: (id: number) => ({ format: "world-flipper-server-player-save", version: 1, player: { id } }),
        importPlayer: (id: number) => ({ playerId: id, importedSections: 2, importedRows: 5, replaced: true }),
    } as any;
    const app = Fastify();
    return { app, clock, plugin: createAdminWebRoutes(repository, playerData, clock, {
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
