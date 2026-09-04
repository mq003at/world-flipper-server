import assert from "node:assert/strict";
import test from "node:test";
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

const config: AppConfig = {
    host: "localhost",
    port: 8000,
    databasePath: ":memory:",
    cdnDir: path.join(tmpdir(), "world-flipper-test-cdn"),
    assetManifestDir: path.resolve(process.cwd(), "content/asset-lists"),
    masterDataDir: path.resolve(process.cwd(), "content/master"),
    logger: false,
};

async function bootstrapViewer(app: Awaited<ReturnType<typeof createApp>>): Promise<number> {
    const login = await app.inject({
        method: "POST",
        url: "/openapi/service/v4/auth/loginDevice",
        headers: { "content-type": "application/json" },
        payload: {
            appId: "561429", deviceId: "device-1", serialNo: "serial-1", whiteKey: "guest-secret",
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

test("story quest first clear grants reward once", async () => {
    const database = createDatabase(":memory:");
    const app = await createApp(config, {
        database,
        clock: new FixedClock(new Date("2026-09-04T12:00:00.000Z")),
        tokens: new SequenceTokens(),
        random: new FirstRandom(),
    });
    try {
        const viewerId = await bootstrapViewer(app);
        const body = { viewer_id: viewerId, quest_id: 1001001, category: 1, party_id: 1, api_count: 0 };
        const first = await app.inject({
            method: "POST", url: "/latest/api/index.php/story_quest/finish",
            headers: { "content-type": "application/x-www-form-urlencoded" }, payload: encode(body),
        });
        assert.equal(first.statusCode, 200);
        const firstData = decode(first.body).data as Record<string, unknown>;
        assert.equal((firstData.user_info as Record<string, unknown>).free_vmoney, 165);

        const second = await app.inject({
            method: "POST", url: "/latest/api/index.php/story_quest/finish",
            headers: { "content-type": "application/x-www-form-urlencoded" }, payload: encode(body),
        });
        assert.deepEqual(decode(second.body).data, []);
    } finally {
        await app.close(); database.close();
    }
});

test("single battle active quest survives persistence and finish updates progression", async () => {
    const database = createDatabase(":memory:");
    const app = await createApp(config, {
        database,
        clock: new FixedClock(new Date("2026-09-04T12:00:00.000Z")),
        tokens: new SequenceTokens(),
        random: new FirstRandom(),
    });
    try {
        const viewerId = await bootstrapViewer(app);
        const start = await app.inject({
            method: "POST", url: "/latest/api/index.php/single_battle_quest/start",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({
                viewer_id: viewerId, quest_id: 1001002, category: 1, party_id: 1,
                use_boost_point: false, use_boss_boost_point: false,
                is_auto_start_mode: false, play_id: "play-1", api_count: 0,
            }),
        });
        assert.equal(start.statusCode, 200);
        const active = database.prepare("SELECT quest_id, category FROM player_active_quests").get() as { quest_id: number; category: number };
        assert.equal(active.quest_id, 1001002);
        assert.equal(active.category, 1);

        const finish = await app.inject({
            method: "POST", url: "/latest/api/index.php/single_battle_quest/finish",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encode({
                viewer_id: viewerId, quest_id: 999, category: 999,
                elapsed_time_ms: 170000, score: 1234, add_mana: 0,
                is_accomplished: true, is_restored: false, continue_count: 0, api_count: 0,
                statistics: {
                    clear_phase: 1,
                    party: {
                        characters: [{ id: 1 }, null, null],
                        unison_characters: [null, null, null],
                        equipments: [null, null, null],
                        ability_soul_ids: [null, null, null],
                    },
                },
            }),
        });
        assert.equal(finish.statusCode, 200);
        const data = decode(finish.body).data as Record<string, unknown>;
        assert.equal(data.clear_rank, 5);
        assert.equal(data.category_id, 1);
        const progress = database.prepare(`
            SELECT finished, clear_rank, high_score FROM players_quest_progress
            WHERE section = 1 AND quest_id = 1001002
        `).get() as { finished: number; clear_rank: number; high_score: number };
        assert.equal(progress.finished, 1);
        assert.equal(progress.clear_rank, 5);
        assert.equal(progress.high_score, 1234);
        assert.equal(database.prepare("SELECT COUNT(*) AS n FROM player_active_quests").get().n, 0);
    } finally {
        await app.close(); database.close();
    }
});
