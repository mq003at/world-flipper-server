import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pack, unpack } from "msgpackr";
import type { AppConfig } from "../../src/app/config";
import { createApp } from "../../src/app/create-app";
import type { Clock } from "../../src/infrastructure/clock/clock";
import { createDatabase } from "../../src/infrastructure/database/database";
import type { RandomSource } from "../../src/infrastructure/random/random-source";
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

class FirstRandom implements RandomSource {
    nextInt(minInclusive: number, _maxExclusive: number): number { return minInclusive; }
}

function encode(value: unknown): string {
    return pack(value).toString("base64");
}

function decode(body: string): Record<string, unknown> {
    return unpack(Buffer.from(body, "base64")) as Record<string, unknown>;
}

function createTestMasterData(): string {
    const target = mkdtempSync(path.join(tmpdir(), "world-flipper-gacha-master-"));
    cpSync(path.resolve(process.cwd(), "content/master"), target, { recursive: true });

    writeFileSync(
        path.join(target, "gacha.json"),
        JSON.stringify({
            "900001": {
                type: 0,
                paymentType: 1,
                singleCost: 150,
                multiCost: 1500,
                discountCost: 50,
                startDate: "2021-01-01 00:00:00",
                endDate: "2099-01-01 00:00:00",
                pool: {
                    "1": [{ id: 243001, rank: 5, odds: 1, isRateUp: false, rarity: 1000 }],
                    "2": [{ id: 243001, rank: 4, odds: 1, isRateUp: false, rarity: 1000 }],
                    "3": [{ id: 243001, rank: 3, odds: 1, isRateUp: false, rarity: 1000 }],
                },
                movieName: "normal",
                guaranteeMovieName: "normal_guarantee",
            },
            "900002": {
                type: 1,
                paymentType: 1,
                singleCost: 75,
                multiCost: 750,
                discountCost: 25,
                startDate: "2021-01-01 00:00:00",
                endDate: "2099-01-01 00:00:00",
                pool: {
                    "1": [{ id: 999101, rank: 5, odds: 1, isRateUp: false, rarity: 1000 }],
                    "2": [{ id: 999101, rank: 4, odds: 1, isRateUp: false, rarity: 1000 }],
                    "3": [{ id: 999101, rank: 3, odds: 1, isRateUp: false, rarity: 1000 }],
                },
            },
        }),
    );
    writeFileSync(path.join(target, "gacha_campaign.json"), JSON.stringify({ "900001": 1 }));
    writeFileSync(
        path.join(target, "gacha_movie_seeds.json"),
        JSON.stringify({ "2": { "0": [10000001], "1": [10000002] } }),
    );
    writeFileSync(
        path.join(target, "gacha_rate_up_movie_seeds.json"),
        JSON.stringify({ "2": { "0": [10000003], "1": [10000004] } }),
    );
    return target;
}

function makeConfig(masterDataDir: string): AppConfig {
    return {
        host: "localhost",
        port: 8000,
        databasePath: ":memory:",
        cdnDir: path.join(tmpdir(), "world-flipper-test-cdn"),
        assetManifestDir: path.resolve(process.cwd(), "content/asset-lists"),
        masterDataDir,
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
            deviceId: "device-1",
            serialNo: "serial-1",
            whiteKey: "guest-secret",
        },
    });
    const zat = (login.json() as { zat: string }).zat;
    const signup = await app.inject({
        method: "POST",
        url: "/latest/api/index.php/tool/signup",
        headers: { "content-type": "application/x-www-form-urlencoded", udid: "test-udid" },
        payload: encode({ access_token: zat }),
    });
    return Number((decode(signup.body).data_headers as Record<string, unknown>).viewer_id);
}

test("character gacha consumes beads, grants character, and updates exchange points", async () => {
    const masterDataDir = createTestMasterData();
    const database = createDatabase(":memory:");
    const app = await createApp(makeConfig(masterDataDir), {
        database,
        clock: new FixedClock(new Date("2026-09-04T12:00:00.000Z")),
        tokens: new SequenceTokens(),
        random: new FirstRandom(),
    });

    try {
        const viewerId = await bootstrapViewer(app);
        const response = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/gacha/exec",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({
                api_count: 0,
                payment_type: 1,
                number_of_exec: 1,
                viewer_id: viewerId,
                gacha_id: 900001,
                type: 1,
            }),
        });

        assert.equal(response.statusCode, 200);
        const data = decode(response.body).data as Record<string, unknown>;
        assert.equal((data.user_info as Record<string, unknown>).free_vmoney, 0);
        const draw = (data.draw as Array<Record<string, unknown>>)[0];
        assert.equal(draw.character_id, 243001);
        assert.equal(draw.movie_id, "normal");
        assert.equal(draw.seed, 10000001);

        const info = database.prepare(`
            SELECT is_daily_first, is_account_first, gacha_exchange_point
            FROM players_gacha_info WHERE gacha_id = 900001
        `).get() as { is_daily_first: number; is_account_first: number; gacha_exchange_point: number };
        assert.deepEqual(info, { is_daily_first: 0, is_account_first: 0, gacha_exchange_point: 1 });
    } finally {
        await app.close();
        database.close();
        rmSync(masterDataDir, { recursive: true, force: true });
    }
});

test("ticket and campaign payments persist consumption", async () => {
    const masterDataDir = createTestMasterData();
    const database = createDatabase(":memory:");
    const app = await createApp(makeConfig(masterDataDir), {
        database,
        clock: new FixedClock(new Date("2026-09-04T12:00:00.000Z")),
        tokens: new SequenceTokens(),
        random: new FirstRandom(),
    });

    try {
        const viewerId = await bootstrapViewer(app);
        const player = database.prepare("SELECT id FROM players LIMIT 1").get() as { id: number };
        database.prepare("INSERT INTO players_items (id, amount, player_id) VALUES (999003, 1, ?)").run(player.id);

        const ticket = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/gacha/exec",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({
                api_count: 0,
                payment_type: 3,
                number_of_exec: 1,
                viewer_id: viewerId,
                gacha_id: 900001,
                type: 10,
            }),
        });
        assert.equal(ticket.statusCode, 200);
        const ticketData = decode(ticket.body).data as Record<string, unknown>;
        assert.equal((ticketData.item_list as Record<string, unknown>)["999003"], 0);

        const campaign = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/gacha/exec",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({
                api_count: 0,
                payment_type: 4,
                number_of_exec: 1,
                viewer_id: viewerId,
                gacha_id: 900001,
                type: 7,
            }),
        });
        assert.equal(campaign.statusCode, 200);
        const row = database.prepare(`
            SELECT count FROM players_gacha_campaigns
            WHERE player_id = ? AND gacha_id = 900001 AND campaign_id = 1
        `).get(player.id) as { count: number };
        assert.equal(row.count, 0);
    } finally {
        await app.close();
        database.close();
        rmSync(masterDataDir, { recursive: true, force: true });
    }
});

test("spark exchange consumes 250 points and validates banner membership", async () => {
    const masterDataDir = createTestMasterData();
    const database = createDatabase(":memory:");
    const app = await createApp(makeConfig(masterDataDir), {
        database,
        clock: new FixedClock(new Date("2026-09-04T12:00:00.000Z")),
        tokens: new SequenceTokens(),
        random: new FirstRandom(),
    });

    try {
        const viewerId = await bootstrapViewer(app);
        const player = database.prepare("SELECT id FROM players LIMIT 1").get() as { id: number };
        database.prepare(`
            INSERT INTO players_gacha_info (
                gacha_id, is_daily_first, is_account_first, gacha_exchange_point, player_id
            ) VALUES (900001, 1, 1, 250, ?)
        `).run(player.id);

        const exchange = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/gacha/exchange_character",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({
                api_count: 0,
                viewer_id: viewerId,
                gacha_id: 900001,
                character_id: 243001,
            }),
        });
        assert.equal(exchange.statusCode, 200);
        const info = database.prepare(`
            SELECT gacha_exchange_point FROM players_gacha_info
            WHERE player_id = ? AND gacha_id = 900001
        `).get(player.id) as { gacha_exchange_point: number };
        assert.equal(info.gacha_exchange_point, 0);

        const invalid = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/gacha/exchange_character",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({
                api_count: 0,
                viewer_id: viewerId,
                gacha_id: 900001,
                character_id: 251001,
            }),
        });
        assert.equal(invalid.statusCode, 400);
    } finally {
        await app.close();
        database.close();
        rmSync(masterDataDir, { recursive: true, force: true });
    }
});
