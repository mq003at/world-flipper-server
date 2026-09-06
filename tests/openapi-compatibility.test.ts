import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import type { Clock } from "../src/infrastructure/clock/clock";
import { createIdentityRoutes } from "../src/modules/identity/identity.routes";
import type { IdentityService } from "../src/modules/identity/identity.service";

const OPENAPI_PREFIX = "/openapi/service";
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function createTestApp() {
    const app = Fastify();
    const unusedService = {} as IdentityService;
    const clock: Clock = { now: () => new Date("2026-01-01T00:00:00.000Z") };

    await app.register(createIdentityRoutes(unusedService, clock), {
        prefix: OPENAPI_PREFIX,
    });
    await app.ready();
    return app;
}

test("Kakao SDK log endpoints return a log id", async (context) => {
    const app = await createTestApp();
    context.after(() => app.close());

    for (const path of ["writeSdkBasicLog", "writeRoundLog"]) {
        const response = await app.inject({
            method: "POST",
            url: `${OPENAPI_PREFIX}/v3/log/${path}`,
            payload: {},
        });

        assert.equal(response.statusCode, 200);
        assert.match(response.json<{ logId: string }>().logId, UUID_PATTERN);
    }
});

test("promotion popup routes retain the captured response contracts", async (context) => {
    const app = await createTestApp();
    context.after(() => app.close());

    const popupList = await app.inject({
        method: "POST",
        url: `${OPENAPI_PREFIX}/v3/promotion/popup/getList`,
        payload: {
            appId: "561429",
            playerId: "984521158255",
            popupType: "opening",
        },
    });
    assert.equal(popupList.statusCode, 200);
    assert.deepEqual(popupList.json(), { popups: [] });

    const startingPopups = await app.inject({
        method: "POST",
        url: `${OPENAPI_PREFIX}/v3/promotion/getStartingPopups`,
        payload: { appId: "561429", playerId: "984521158255" },
    });
    assert.equal(startingPopups.statusCode, 200);
    assert.deepEqual(startingPopups.json(), {
        promotions: [],
        appId: "561429",
        playerId: "984521158255",
    });

    const urlPromotion = await app.inject({
        method: "POST",
        url: `${OPENAPI_PREFIX}/v3/promotion/checkUrlPromotion`,
        payload: { appId: "561429", playerId: "984521158255" },
    });
    assert.equal(urlPromotion.statusCode, 200);
    assert.deepEqual(urlPromotion.json(), { result: "NO_PROMOTION" });
});
