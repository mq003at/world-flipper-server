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

function encodeRequest(value: unknown): string {
    return pack(value).toString("base64");
}

function decodeResponse(body: string): Record<string, unknown> {
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
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            udid: "test-udid",
        },
        payload: encodeRequest({ access_token: zat }),
    });
    const payload = decodeResponse(signup.body);
    return Number((payload.data_headers as Record<string, unknown>).viewer_id);
}

test("tutorial skip path performs the forced gacha and free-character steps", async () => {
    const database = createDatabase(":memory:");
    const app = await createApp(config, {
        database,
        clock: new FixedClock(new Date("2026-09-04T12:00:00.000Z")),
        tokens: new SequenceTokens(),
        random: new FirstRandom(),
    });

    try {
        const viewerId = await bootstrapViewer(app);

        const gachaStep = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/tutorial/update_step",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encodeRequest({
                viewer_id: viewerId,
                step: 3,
                skip: true,
                gacha_id: 999999,
                api_count: 0,
                statistics: {},
            }),
        });
        assert.equal(gachaStep.statusCode, 200);
        const gachaPayload = decodeResponse(gachaStep.body);
        const gachaData = gachaPayload.data as Record<string, unknown>;
        assert.equal(gachaData.step, 15);
        assert.equal((gachaData.user_info as Record<string, unknown>).free_vmoney, 0);
        const gacha = gachaData.gacha as Record<string, unknown>;
        const draw = (gacha.draw as Array<Record<string, unknown>>)[0];
        assert.equal(draw.character_id, 251001);
        assert.equal(draw.movie_id, "normal_guarantee");
        assert.equal(draw.seed, 10007656);

        const freeCharacterStep = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/tutorial/update_step",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encodeRequest({
                viewer_id: viewerId,
                step: 4,
                skip: true,
                api_count: 0,
                statistics: {},
            }),
        });
        assert.equal(freeCharacterStep.statusCode, 200);
        const freePayload = decodeResponse(freeCharacterStep.body);
        const freeData = freePayload.data as Record<string, unknown>;
        assert.equal(freeData.step, 16);
        assert.equal((freeData.user_info as Record<string, unknown>).free_vmoney, 1500);
        const characters = freeData.character_list as Array<Record<string, unknown>>;
        assert.equal(characters[0].character_id, 243001);

        const finish = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/tutorial/finish_trigger",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encodeRequest({
                viewer_id: viewerId,
                tutorial_ids: [12],
                api_count: 0,
            }),
        });
        assert.equal(finish.statusCode, 200);
    } finally {
        await app.close();
        database.close();
    }
});
