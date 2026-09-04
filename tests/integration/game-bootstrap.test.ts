import assert from "node:assert/strict";
import test from "node:test";
import { tmpdir } from "node:os";
import path from "node:path";
import { pack, unpack } from "msgpackr";
import type { AppConfig } from "../../src/app/config";
import { createApp } from "../../src/app/create-app";
import type { Clock } from "../../src/infrastructure/clock/clock";
import { createDatabase } from "../../src/infrastructure/database/database";
import type { TokenGenerator } from "../../src/infrastructure/security/token-generator";

class FixedClock implements Clock {
    constructor(private readonly value: Date) {}
    now(): Date {
        return new Date(this.value);
    }
}

class SequenceTokens implements TokenGenerator {
    private next = 0;
    createSessionToken(): string {
        return `token-${++this.next}`;
    }
    createViewerId(): number {
        return 123456789;
    }
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
    logger: false,
};

test("guest login -> signup -> load creates and returns the default player", async () => {
    const database = createDatabase(":memory:");
    const app = await createApp(config, {
        database,
        clock: new FixedClock(new Date("2026-09-04T12:00:00.000Z")),
        tokens: new SequenceTokens(),
    });

    try {
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
        assert.equal(login.statusCode, 200);
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
        assert.equal(signup.statusCode, 200);
        const signupPayload = decodeResponse(signup.body);
        const signupHeaders = signupPayload.data_headers as Record<string, unknown>;
        assert.equal(signupHeaders.viewer_id, 123456789);
        assert.equal(signupHeaders.udid, "test-udid");

        const load = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/load",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: encodeRequest({ access_token: zat, viewer_id: 123456789 }),
        });
        assert.equal(load.statusCode, 200);

        const loadPayload = decodeResponse(load.body);
        const data = loadPayload.data as Record<string, unknown>;
        const userInfo = data.user_info as Record<string, unknown>;
        const characters = data.user_character_list as Record<string, unknown>;
        const tutorial = data.user_tutorial as Record<string, unknown>;

        assert.equal(userInfo.name, "플레이어");
        assert.equal(userInfo.free_vmoney, 150);
        assert.ok(characters["1"]);
        assert.equal(tutorial.viewer_id, 123456789);
        assert.equal(tutorial.tutorial_step, 0);
    } finally {
        await app.close();
        database.close();
    }
});
