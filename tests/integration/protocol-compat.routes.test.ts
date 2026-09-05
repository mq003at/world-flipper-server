import assert from "node:assert/strict";
import test from "node:test";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AppConfig } from "../../src/app/config";
import { createApp } from "../../src/app/create-app";
import { createDatabase } from "../../src/infrastructure/database/database";

const config: AppConfig = {
    host: "localhost",
    port: 8000,
    databasePath: ":memory:",
    cdnDir: path.join(tmpdir(), "world-flipper-test-cdn"),
    assetManifestDir: path.resolve(process.cwd(), "content/asset-lists"),
    masterDataDir: path.resolve(process.cwd(), "content/master"),
    logger: false,
};

test("Kakao/OpenAPI compatibility parser accepts an empty form body", async () => {
    const database = createDatabase(":memory:");
    const app = await createApp(config, { database });

    try {
        const response = await app.inject({
            method: "POST",
            url: "/openapi/service/v3/util/country/get",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: "",
        });

        assert.equal(response.statusCode, 200);
        assert.deepEqual(response.json(), { country: "en" });
    } finally {
        await app.close();
        database.close();
    }
});

test("World Flipper reproduce/post compatibility endpoint returns the legacy no-op response", async () => {
    const { pack, unpack } = await import("msgpackr");
    const database = createDatabase(":memory:");
    const app = await createApp(config, { database });

    try {
        const response = await app.inject({
            method: "POST",
            url: "/latest/api/index.php/reproduce/post",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: pack({
                create_time: "2026-09-05T00:00:00Z",
                device_log_sequence_number: 1,
                viewer_id: 123456789,
                device_id: 1,
                info: "compatibility test",
                os_name: "android",
                device_name: "test-device",
            }).toString("base64"),
        });

        assert.equal(response.statusCode, 200);
        const payload = unpack(Buffer.from(response.body, "base64")) as Record<string, unknown>;
        const headers = payload.data_headers as Record<string, unknown>;
        assert.equal(headers.viewer_id, 123456789);
        assert.deepEqual(payload.data, []);
    } finally {
        await app.close();
        database.close();
    }
});
