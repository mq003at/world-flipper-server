import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pack, unpack } from "msgpackr";
import type { AppConfig } from "../../src/app/config";
import { createApp } from "../../src/app/create-app";
import type { Clock } from "../../src/infrastructure/clock/clock";
import { createDatabase } from "../../src/infrastructure/database/database";

class FixedClock implements Clock {
    now(): Date {
        return new Date("2026-09-04T12:00:00.000Z");
    }
}

function encodeRequest(value: unknown): string {
    return pack(value).toString("base64");
}

function decodeResponse(body: string): Record<string, unknown> {
    return unpack(Buffer.from(body, "base64")) as Record<string, unknown>;
}

test("asset version_info and get_path expose the captured EN Android contract", async () => {
    const root = path.join(tmpdir(), `world-flipper-asset-${Date.now()}`);
    const cdnDir = path.join(root, "cdn");
    const entitiesDir = path.join(cdnDir, "en", "entities");
    mkdirSync(path.join(entitiesDir, "files"), { recursive: true });
    writeFileSync(path.join(entitiesDir, "2.1.125-android_medium.csv"), "", "utf8");

    const config: AppConfig = {
        host: "localhost",
        port: 8000,
        databasePath: ":memory:",
        cdnDir,
        assetManifestDir: path.resolve(process.cwd(), "content/asset-lists"),
        logger: false,
    };
    const database = createDatabase(":memory:");
    const app = await createApp(config, {
        database,
        clock: new FixedClock(),
    });

    try {
        const versionInfo = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/asset/version_info",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                device_lang: "en",
            },
            payload: encodeRequest({}),
        });
        assert.equal(versionInfo.statusCode, 200);
        const versionPayload = decodeResponse(versionInfo.body);
        const versionData = versionPayload.data as Record<string, unknown>;
        assert.equal(versionData.files_list, "{$cdnAddress}/en/entities/2.1.125-android_medium.csv");
        assert.equal(versionData.total_size, 8_846_063_846);

        const getPath = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/asset/get_path",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                device_lang: "en",
            },
            payload: encodeRequest({ viewer_id: 123, target_asset_version: "2.1.125" }),
        });
        assert.equal(getPath.statusCode, 200);
        const pathPayload = decodeResponse(getPath.body);
        const pathData = pathPayload.data as Record<string, unknown>;
        const info = pathData.info as Record<string, unknown>;
        assert.equal(info.target_asset_version, "2.1.125");
        assert.equal(info.is_initial, true);
    } finally {
        await app.close();
        database.close();
        rmSync(root, { recursive: true, force: true });
    }
});
