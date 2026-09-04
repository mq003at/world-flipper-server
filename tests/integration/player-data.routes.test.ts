import assert from "node:assert/strict";
import path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { pack, unpack } from "msgpackr";
import type { AppConfig } from "../../src/app/config";
import { createApp } from "../../src/app/create-app";
import type { Clock } from "../../src/infrastructure/clock/clock";
import { createDatabase } from "../../src/infrastructure/database/database";
import type { TokenGenerator } from "../../src/infrastructure/security/token-generator";

class FixedClock implements Clock {
    constructor(private readonly value: Date) {}
    now(): Date { return new Date(this.value); }
}

class SequenceTokens implements TokenGenerator {
    private next = 0;
    createSessionToken(): string { return `token-${++this.next}`; }
    createViewerId(): number { return 123456789; }
}

function encode(value: unknown): string {
    return pack(value).toString("base64");
}

function decode(body: string): Record<string, unknown> {
    return unpack(Buffer.from(body, "base64")) as Record<string, unknown>;
}

function makeConfig(importEnabled = true): AppConfig {
    return {
        host: "localhost",
        port: 8000,
        databasePath: ":memory:",
        cdnDir: path.join(tmpdir(), "world-flipper-player-data-cdn"),
        assetManifestDir: path.resolve(process.cwd(), "content/asset-lists"),
        masterDataDir: path.resolve(process.cwd(), "content/master"),
        liveContentDir: path.resolve(process.cwd(), "content/live"),
        playerDataImportEnabled: importEnabled,
        logger: false,
    };
}

async function bootstrapViewer(app: Awaited<ReturnType<typeof createApp>>): Promise<number> {
    const login = await app.inject({
        method: "POST",
        url: "/openapi/service/v4/auth/loginDevice",
        headers: { "content-type": "application/json" },
        payload: {
            appId: "561429",
            deviceId: "device-player-data",
            serialNo: "serial-player-data",
            whiteKey: "guest-player-data",
        },
    });
    assert.equal(login.statusCode, 200);
    const zat = (login.json() as { zat: string }).zat;
    const signup = await app.inject({
        method: "POST",
        url: "/latest/api/index.php/tool/signup",
        headers: { "content-type": "application/x-www-form-urlencoded", udid: "test-udid" },
        payload: encode({ access_token: zat }),
    });
    assert.equal(signup.statusCode, 200);
    return Number((decode(signup.body).data_headers as Record<string, unknown>).viewer_id);
}

test("player export/import restores portable game state while preserving identity", async () => {
    const database = createDatabase(":memory:");
    const app = await createApp(makeConfig(true), {
        database,
        clock: new FixedClock(new Date("2026-09-05T12:00:00.000Z")),
        tokens: new SequenceTokens(),
    });

    try {
        const viewerId = await bootstrapViewer(app);
        const identityBefore = database.prepare(`
            SELECT p.id AS player_id, p.account_id, s.token
            FROM players p
            JOIN sessions s ON s.account_id = p.account_id AND s.type = 2
            LIMIT 1
        `).get() as { player_id: number; account_id: number; token: string };

        database.prepare("UPDATE players SET name = ?, free_vmoney = ?, vmoney = ? WHERE id = ?")
            .run("Portable Hero", 4321, 765, identityBefore.player_id);
        database.prepare(`
            INSERT INTO players_items (id, amount, player_id)
            VALUES (900001, 77, ?)
        `).run(identityBefore.player_id);
        database.prepare(`
            INSERT INTO player_event_state
                (player_id, event_key, joined_at, last_seen_at, completed_at, payload_json)
            VALUES (?, 'event:test', ?, ?, NULL, '{"score":123}')
        `).run(identityBefore.player_id, "2026-09-05T12:00:00.000Z", "2026-09-05T12:00:00.000Z");
        database.prepare(`
            INSERT INTO player_mail
                (player_id, source_key, title, body, rewards_json, created_at, expires_at, read_at, claimed_at)
            VALUES (?, 'portable-mail', 'Hello', 'Body', '[]', ?, NULL, NULL, NULL)
        `).run(identityBefore.player_id, "2026-09-05T12:00:00.000Z");
        database.prepare(`
            INSERT INTO player_payment_grants
                (player_id, product_id, paid_vmoney, transaction_id, created_at)
            VALUES (?, 'debug-pack', 765, 'non-portable-ledger', ?)
        `).run(identityBefore.player_id, "2026-09-05T12:00:00.000Z");

        const exported = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/player_data/export",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({ viewer_id: viewerId }),
        });
        assert.equal(exported.statusCode, 200);
        const exportData = decode(exported.body).data as Record<string, unknown>;
        const save = exportData.player_save as Record<string, unknown>;
        assert.equal(save.format, "world-flipper-server-player-save");
        assert.equal(save.version, 1);
        const savedPlayer = save.player as Record<string, unknown>;
        assert.equal(savedPlayer.name, "Portable Hero");
        assert.equal(savedPlayer.free_vmoney, 4321);
        assert.equal("id" in savedPlayer, false);
        assert.equal("account_id" in savedPlayer, false);
        const state = save.state as Record<string, Array<Record<string, unknown>>>;
        assert.equal(state.items.some((row) => row.id === 900001 && row.amount === 77), true);
        assert.equal(state.eventState[0].event_key, "event:test");
        assert.equal(state.mail[0].source_key, "portable-mail");
        assert.equal("id" in state.mail[0], false);
        assert.equal("paymentGrants" in state, false);

        // Destroy/replace the current game state before restoring the save.
        database.prepare("UPDATE players SET name = ?, free_vmoney = ?, vmoney = ? WHERE id = ?")
            .run("Broken", 1, 2, identityBefore.player_id);
        database.prepare("DELETE FROM players_items WHERE player_id = ?").run(identityBefore.player_id);
        database.prepare("DELETE FROM player_event_state WHERE player_id = ?").run(identityBefore.player_id);
        database.prepare("DELETE FROM player_mail WHERE player_id = ?").run(identityBefore.player_id);

        const imported = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/player_data/import",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({ viewer_id: viewerId, replace: true, save }),
        });
        assert.equal(imported.statusCode, 200);
        const importData = decode(imported.body).data as Record<string, unknown>;
        assert.equal(importData.imported, true);
        assert.ok(Number(importData.imported_rows) > 0);

        const playerAfter = database.prepare(
            "SELECT id, account_id, name, free_vmoney, vmoney FROM players WHERE id = ?",
        ).get(identityBefore.player_id) as {
            id: number;
            account_id: number;
            name: string;
            free_vmoney: number;
            vmoney: number;
        };
        assert.deepEqual(playerAfter, {
            id: identityBefore.player_id,
            account_id: identityBefore.account_id,
            name: "Portable Hero",
            free_vmoney: 4321,
            vmoney: 765,
        });
        assert.deepEqual(
            database.prepare("SELECT id, amount FROM players_items WHERE player_id = ? AND id = 900001")
                .get(identityBefore.player_id),
            { id: 900001, amount: 77 },
        );
        assert.equal(
            (database.prepare("SELECT COUNT(*) AS n FROM player_event_state WHERE player_id = ?")
                .get(identityBefore.player_id) as { n: number }).n,
            1,
        );
        assert.equal(
            (database.prepare("SELECT COUNT(*) AS n FROM player_mail WHERE player_id = ? AND source_key = 'portable-mail'")
                .get(identityBefore.player_id) as { n: number }).n,
            1,
        );

        const identityAfter = database.prepare(`
            SELECT p.account_id, s.token
            FROM players p
            JOIN sessions s ON s.account_id = p.account_id AND s.type = 2
            WHERE p.id = ?
        `).get(identityBefore.player_id) as { account_id: number; token: string };
        assert.equal(identityAfter.account_id, identityBefore.account_id);
        assert.equal(identityAfter.token, identityBefore.token);

        // Audit ledger is intentionally not part of the portable save and therefore is not replaced.
        assert.equal(
            (database.prepare("SELECT COUNT(*) AS n FROM player_payment_grants WHERE player_id = ?")
                .get(identityBefore.player_id) as { n: number }).n,
            1,
        );
    } finally {
        await app.close();
        database.close();
    }
});

test("tampered save fails integrity validation before replacing state", async () => {
    const database = createDatabase(":memory:");
    const app = await createApp(makeConfig(true), {
        database,
        clock: new FixedClock(new Date("2026-09-05T12:00:00.000Z")),
        tokens: new SequenceTokens(),
    });

    try {
        const viewerId = await bootstrapViewer(app);
        const exported = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/player_data/export",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({ viewer_id: viewerId }),
        });
        const save = ((decode(exported.body).data as Record<string, unknown>).player_save as Record<string, unknown>);
        const player = save.player as Record<string, unknown>;
        player.free_vmoney = 99999999;

        const imported = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/player_data/import",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({ viewer_id: viewerId, replace: true, save }),
        });
        assert.equal(imported.statusCode, 400);
        const row = database.prepare("SELECT free_vmoney FROM players LIMIT 1").get() as { free_vmoney: number };
        assert.equal(row.free_vmoney, 150);
    } finally {
        await app.close();
        database.close();
    }
});

test("HTTP player import is disabled by default/config while export remains available", async () => {
    const database = createDatabase(":memory:");
    const app = await createApp(makeConfig(false), {
        database,
        clock: new FixedClock(new Date("2026-09-05T12:00:00.000Z")),
        tokens: new SequenceTokens(),
    });

    try {
        const viewerId = await bootstrapViewer(app);
        const exported = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/player_data/export",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({ viewer_id: viewerId }),
        });
        assert.equal(exported.statusCode, 200);
        const save = ((decode(exported.body).data as Record<string, unknown>).player_save as unknown);

        const imported = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/player_data/import",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({ viewer_id: viewerId, replace: true, save }),
        });
        assert.equal(imported.statusCode, 400);
    } finally {
        await app.close();
        database.close();
    }
});
