import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
    const target = mkdtempSync(path.join(tmpdir(), "world-flipper-shop-master-"));

    writeFileSync(
        path.join(target, "character.json"),
        JSON.stringify({
            "1": { rarity: 1, element: 0, skill_count: 3 },
            "243001": { rarity: 5, element: 0, skill_count: 4 },
        }),
    );

    // Deliberately expired original dates: Phase 3 does not use the historic
    // Global schedule. Phase 4 ScheduleService will own live availability.
    writeFileSync(
        path.join(target, "treasure_shop.json"),
        JSON.stringify({
            "5001": {
                costs: [],
                rewards: [{ type: 0, id: 9001, count: 2 }],
                availableFrom: "2021-01-01 00:00:00",
                availableUntil: "2024-07-25 00:00:00",
                stock: 2,
                userCost: { type: 1, amount: 100 },
            },
        }),
    );

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
                endDate: "2024-07-25 00:00:00",
                pool: {
                    "1": [{ id: 243001, rank: 5, odds: 1, isRateUp: false, rarity: 1000 }],
                    "2": [{ id: 243001, rank: 4, odds: 1, isRateUp: false, rarity: 1000 }],
                    "3": [{ id: 243001, rank: 3, odds: 1, isRateUp: false, rarity: 1000 }],
                },
                movieName: "normal",
                guaranteeMovieName: "normal_guarantee",
            },
        }),
    );
    writeFileSync(path.join(target, "gacha_campaign.json"), JSON.stringify({}));
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

test("shop buy consumes cost, grants reward, and persists stock counters", async () => {
    const masterDataDir = createTestMasterData();
    const database = createDatabase(":memory:");
    const app = await createApp(makeConfig(masterDataDir), {
        database,
        clock: new FixedClock(new Date("2026-09-05T12:00:00.000Z")),
        tokens: new SequenceTokens(),
        random: new FirstRandom(),
    });

    try {
        const viewerId = await bootstrapViewer(app);
        const salesBefore = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/shop/get_sales_list",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({
                equipment_enhancement_shop_category_ids: [],
                boss_coin_shop_category_ids: [],
                browse_treasure_flag: true,
                shop_types: [2],
                event_list: [],
                viewer_id: viewerId,
            }),
        });
        assert.equal(salesBefore.statusCode, 200);
        const beforeList = ((decode(salesBefore.body).data as Record<string, unknown>)
            .sales_list as Array<Record<string, unknown>>);
        assert.equal(beforeList.length, 1);
        assert.equal(beforeList[0].stock_quantity, 2);
        assert.equal(beforeList[0].total_purchase_num, 0);

        const buy = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/shop/buy",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({
                shop_type: 2,
                api_count: 0,
                shop_item_id: 5001,
                number: 1,
                viewer_id: viewerId,
            }),
        });
        assert.equal(buy.statusCode, 200);
        const buyData = decode(buy.body).data as Record<string, unknown>;
        assert.equal((buyData.user_info as Record<string, unknown>).free_mana, 900);
        assert.equal((buyData.item_list as Record<string, unknown>)["9001"], 2);

        const purchase = database.prepare(`
            SELECT today_purchase_num, this_month_purchase_num, total_purchase_num
            FROM player_shop_purchases
            WHERE shop_type = 2 AND shop_item_id = 5001
        `).get() as {
            today_purchase_num: number;
            this_month_purchase_num: number;
            total_purchase_num: number;
        };
        assert.deepEqual(purchase, {
            today_purchase_num: 1,
            this_month_purchase_num: 1,
            total_purchase_num: 1,
        });

        const salesAfter = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/shop/get_sales_list",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({
                equipment_enhancement_shop_category_ids: [],
                boss_coin_shop_category_ids: [],
                browse_treasure_flag: true,
                shop_types: [2],
                event_list: [],
                viewer_id: viewerId,
            }),
        });
        const afterList = ((decode(salesAfter.body).data as Record<string, unknown>)
            .sales_list as Array<Record<string, unknown>>);
        assert.equal(afterList[0].stock_quantity, 1);
        assert.equal(afterList[0].today_purchase_num, 1);
        assert.equal(afterList[0].this_month_purchase_num, 1);
        assert.equal(afterList[0].total_purchase_num, 1);
    } finally {
        await app.close();
        database.close();
        rmSync(masterDataDir, { recursive: true, force: true });
    }
});

test("shop rejects stock overflow without charging the player", async () => {
    const masterDataDir = createTestMasterData();
    const database = createDatabase(":memory:");
    const app = await createApp(makeConfig(masterDataDir), {
        database,
        clock: new FixedClock(new Date("2026-09-05T12:00:00.000Z")),
        tokens: new SequenceTokens(),
        random: new FirstRandom(),
    });

    try {
        const viewerId = await bootstrapViewer(app);
        const rejected = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/shop/buy",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({
                shop_type: 2,
                api_count: 0,
                shop_item_id: 5001,
                number: 3,
                viewer_id: viewerId,
            }),
        });
        assert.equal(rejected.statusCode, 400);

        const player = database.prepare("SELECT free_mana FROM players LIMIT 1").get() as {
            free_mana: number;
        };
        assert.equal(player.free_mana, 1000);
        assert.equal(
            (database.prepare("SELECT COUNT(*) AS n FROM player_shop_purchases").get() as { n: number }).n,
            0,
        );
        assert.equal(
            (database.prepare("SELECT COUNT(*) AS n FROM players_items WHERE id = 9001").get() as { n: number }).n,
            0,
        );
    } finally {
        await app.close();
        database.close();
        rmSync(masterDataDir, { recursive: true, force: true });
    }
});

test("fake payment grants paid beads idempotently and paid gacha consumes them", async () => {
    const masterDataDir = createTestMasterData();
    const database = createDatabase(":memory:");
    const app = await createApp(makeConfig(masterDataDir), {
        database,
        clock: new FixedClock(new Date("2026-09-05T12:00:00.000Z")),
        tokens: new SequenceTokens(),
        random: new FirstRandom(),
    });

    try {
        const viewerId = await bootstrapViewer(app);
        const items = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/payment/item_list",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({ api_count: 0, viewer_id: viewerId }),
        });
        assert.equal(items.statusCode, 200);
        const paymentItems = ((decode(items.body).data as Record<string, unknown>)
            .payment_item_list as Array<Record<string, unknown>>);
        assert.ok(paymentItems.some((entry) => entry.paid_vmoney === 1500));

        const payload = {
            viewer_id: viewerId,
            payment_item_id: 5,
            transaction_id: "fan-payment-1",
        };
        const first = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/payment/purchase",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode(payload),
        });
        assert.equal(first.statusCode, 200);
        const firstData = decode(first.body).data as Record<string, unknown>;
        assert.equal((firstData.user_info as Record<string, unknown>).vmoney, 1500);
        assert.equal(firstData.added_vmoney, 1500);
        assert.equal(firstData.replayed, false);

        const replay = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/payment/purchase",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode(payload),
        });
        assert.equal(replay.statusCode, 200);
        const replayData = decode(replay.body).data as Record<string, unknown>;
        assert.equal((replayData.user_info as Record<string, unknown>).vmoney, 1500);
        assert.equal(replayData.added_vmoney, 0);
        assert.equal(replayData.replayed, true);

        const paidGacha = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/gacha/exec",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({
                api_count: 0,
                payment_type: 2,
                number_of_exec: 1,
                viewer_id: viewerId,
                gacha_id: 900001,
                type: 5,
            }),
        });
        assert.equal(paidGacha.statusCode, 200);
        const paidData = decode(paidGacha.body).data as Record<string, unknown>;
        assert.equal((paidData.user_info as Record<string, unknown>).vmoney, 1450);

        const ledger = database.prepare(`
            SELECT COUNT(*) AS n, SUM(paid_vmoney) AS total
            FROM player_payment_grants
        `).get() as { n: number; total: number };
        assert.equal(ledger.n, 1);
        assert.equal(ledger.total, 1500);
    } finally {
        await app.close();
        database.close();
        rmSync(masterDataDir, { recursive: true, force: true });
    }
});
