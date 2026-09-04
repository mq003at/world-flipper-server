import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
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

function encode(value: unknown): string { return pack(value).toString("base64"); }
function decode(body: string): Record<string, unknown> {
    return unpack(Buffer.from(body, "base64")) as Record<string, unknown>;
}

function createLiveContentDir(): string {
    const dir = mkdtempSync(path.join(tmpdir(), "wf-live-"));
    writeFileSync(path.join(dir, "season.json"), JSON.stringify({
        seasonStartsAt: "2026-09-05T00:00:00+07:00",
        sourceStartsAt: "2021-09-08T00:00:00Z",
        sourceEndsAt: "2024-07-25T00:00:00Z",
        durationDays: 90,
        minimumPlayableDurationHours: 72,
        dailyResetHourUtc: 0,
        weekStartsOnUtcDay: 1,
        economy: {
            timeGatedRewardMultiplier: "compression",
            staminaCostMultiplier: "inverse-compression",
            minimumStaminaCost: 1,
        },
    }));
    writeFileSync(path.join(dir, "schedule.json"), "[]");
    writeFileSync(path.join(dir, "events.json"), "[]");
    writeFileSync(path.join(dir, "missions.json"), "[]");
    writeFileSync(path.join(dir, "quest-stamina-costs.json"), "{}");
    writeFileSync(path.join(dir, "mail.json"), JSON.stringify([{
        id: "test-gift",
        sourceKey: "test-gift-v1",
        title: "Test Gift",
        body: "One-time test mail",
        rewards: [{ type: 3, count: 100 }],
        rewardPolicy: "content-bound",
        deliveryWindow: "after-release",
    }]));
    return dir;
}

async function bootstrapViewer(app: Awaited<ReturnType<typeof createApp>>): Promise<{ viewerId: number; zat: string }> {
    const login = await app.inject({
        method: "POST",
        url: "/openapi/service/v4/auth/loginDevice",
        headers: { "content-type": "application/json" },
        payload: { appId: "561429", deviceId: "device-1", serialNo: "serial-1", whiteKey: "guest-secret" },
    });
    const zat = (login.json() as { zat: string }).zat;
    const signup = await app.inject({
        method: "POST",
        url: "/latest/api/index.php/tool/signup",
        headers: { "content-type": "application/x-www-form-urlencoded", udid: "test-udid" },
        payload: encode({ access_token: zat }),
    });
    const viewerId = Number((decode(signup.body).data_headers as Record<string, unknown>).viewer_id);
    return { viewerId, zat };
}

function config(liveContentDir: string): AppConfig {
    return {
        host: "localhost",
        port: 8000,
        databasePath: ":memory:",
        cdnDir: path.join(tmpdir(), "world-flipper-test-cdn"),
        assetManifestDir: path.resolve(process.cwd(), "content/asset-lists"),
        masterDataDir: path.resolve(process.cwd(), "content/master"),
        liveContentDir,
        logger: false,
    };
}

test("scheduled mail materializes once, marks arrival, and claims through RewardService", async () => {
    const liveDir = createLiveContentDir();
    const database = createDatabase(":memory:");
    const app = await createApp(config(liveDir), {
        database,
        clock: new FixedClock(new Date("2026-09-05T12:00:00.000Z")),
        tokens: new SequenceTokens(),
        random: new FirstRandom(),
    });
    try {
        const { viewerId, zat } = await bootstrapViewer(app);
        const load = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/load",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({ access_token: zat, viewer_id: viewerId }),
        });
        assert.equal(load.statusCode, 200);
        const loadData = decode(load.body).data as Record<string, unknown>;
        assert.equal(loadData.mail_arrived, true);
        assert.equal((database.prepare("SELECT COUNT(*) AS n FROM player_mail").get() as { n: number }).n, 1);

        const index = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/mail/index",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({ viewer_id: viewerId, current_page: 1, api_count: 0 }),
        });
        assert.equal(index.statusCode, 200);
        const indexData = decode(index.body).data as { mail: Array<{ mail_id: number }>; total_count: number };
        assert.equal(indexData.total_count, 1);
        const mailId = indexData.mail[0].mail_id;

        const claim = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/mail/claim",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({ viewer_id: viewerId, mail_id: mailId, api_count: 0 }),
        });
        assert.equal(claim.statusCode, 200);
        const claimData = decode(claim.body).data as Record<string, unknown>;
        assert.equal((claimData.user_info as Record<string, unknown>).free_vmoney, 100);
        const row = database.prepare("SELECT claimed_at FROM player_mail WHERE id = ?").get(mailId) as { claimed_at: string | null };
        assert.notEqual(row.claimed_at, null);
    } finally {
        await app.close();
        database.close();
        rmSync(liveDir, { recursive: true, force: true });
    }
});

test("box gacha persists draw state and stop-on-featured charges only actual draws", async () => {
    const liveDir = createLiveContentDir();
    const database = createDatabase(":memory:");
    const app = await createApp(config(liveDir), {
        database,
        clock: new FixedClock(new Date("2026-09-05T12:00:00.000Z")),
        tokens: new SequenceTokens(),
        random: new FirstRandom(),
    });
    try {
        const { viewerId } = await bootstrapViewer(app);
        const player = database.prepare("SELECT id FROM players LIMIT 1").get() as { id: number };
        database.prepare("INSERT INTO players_items (id, amount, player_id) VALUES (?, ?, ?)")
            .run(30101, 100, player.id);

        const exec = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/box_gacha/exec",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({
                viewer_id: viewerId,
                box_gacha_id: 1,
                box_id: 1,
                number: 10,
                stop_on_featured_rewards: true,
                api_count: 0,
            }),
        });
        assert.equal(exec.statusCode, 200);
        const data = decode(exec.body).data as Record<string, unknown>;
        const drawn = data.drawn_reward_list as Array<{ reward_id: number; number: number }>;
        assert.deepEqual(drawn, [{ reward_id: 1000101001, number: 1 }]);
        const itemList = data.item_list as Record<string, number>;
        assert.equal(itemList["30101"], 90);
        const box = database.prepare(`
            SELECT remaining_number, is_closed FROM players_box_gacha
            WHERE player_id = ? AND id = 1 AND box_id = 1
        `).get(player.id) as { remaining_number: number; is_closed: number };
        assert.equal(box.remaining_number, 354);
        assert.equal(box.is_closed, 0);
        assert.equal((database.prepare(`
            SELECT number FROM players_box_gacha_drawn_rewards
            WHERE player_id = ? AND gacha_id = 1 AND box_id = 1 AND id = 1000101001
        `).get(player.id) as { number: number }).number, 1);
    } finally {
        await app.close();
        database.close();
        rmSync(liveDir, { recursive: true, force: true });
    }
});
