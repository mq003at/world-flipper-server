import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import type { Clock } from "../src/infrastructure/clock/clock";
import { registerProtocolCodec } from "../src/app/plugins/protocol-codec";
import { createGxShieldRoutes } from "../src/modules/compatibility/gxshield.routes";
import { decodeBase64MessagePack, encodeBase64MessagePack } from "../src/protocol/worldflipper/codec";

test("GXShield risk telemetry receives a no-op World Flipper acknowledgement", async (context) => {
    const app = Fastify();
    const clock: Clock = { now: () => new Date("2026-09-08T00:00:00.000Z") };
    registerProtocolCodec(app);
    await app.register(createGxShieldRoutes(clock), { prefix: "/latest/api/index.php/gxshield" });
    await app.ready();
    context.after(() => app.close());

    const response = await app.inject({
        method: "POST",
        url: "/latest/api/index.php/gxshield/scanrisk",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        payload: encodeBase64MessagePack({ viewer_id: 8703, risk: "client-report" }),
    });
    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] ?? "", /^application\/x-msgpack/);
    const decoded = decodeBase64MessagePack(response.body) as any;
    assert.equal(decoded.data_headers.viewer_id, 8703);
    assert.equal(decoded.data_headers.result_code, 1);
    assert.deepEqual(decoded.data, []);
});
