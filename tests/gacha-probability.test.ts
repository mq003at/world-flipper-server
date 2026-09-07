import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import type { DisplayCatalog } from "../src/content/display/display-catalog";
import { FixedClock } from "../src/infrastructure/clock/fixed-clock";
import { createGachaProbabilityRoutes } from "../src/modules/gacha-probability/gacha-probability.routes";
import { GachaProbabilityService } from "../src/modules/gacha-probability/gacha-probability.service";
import type { RuntimeGachaBanner } from "../src/modules/gacha/seasonal-gacha.models";

const now = new Date("2026-09-07T05:00:00.000Z");
const banner: RuntimeGachaBanner = {
    seasonNumber: 3,
    cycleIndex: 22,
    slot: "new",
    shellGachaId: 157,
    featuredIds: [151006],
    festival: true,
    startsAt: new Date("2026-09-04T17:00:00.000Z"),
    endsAt: new Date("2026-09-13T17:00:00.000Z"),
    definition: {
        id: 157, type: 0, paymentType: 0, singleCost: 150, multiCost: 1500, discountCost: 0,
        startDate: "2026-09-04T17:00:00.000Z", endDate: "2026-09-13T17:00:00.000Z",
        rankWeights: [750, 2500, 6750],
        pool: {
            1: [
                { id: 151006, rank: 5, odds: 150, isRateUp: true, weight: 1_500_000 },
                { id: 151001, rank: 5, odds: 600, isRateUp: false, weight: 6_000_000 },
            ],
            2: [{ id: 141001, rank: 4, odds: 2500, isRateUp: false, weight: 1 }],
            3: [{ id: 131001, rank: 3, odds: 6750, isRateUp: false, weight: 1 }],
        },
    },
};

const display: DisplayCatalog = {
    find: (_type, id) => ({ id, name: id === 151006 ? "Featured Unit" : `Unit ${id}` }),
};
const seasonal = { activeBanners: () => [banner] } as any;

test("probability manifest uses persisted weights and totals exactly 100 percent", () => {
    const service = new GachaProbabilityService(seasonal, display, new FixedClock(now));
    const result = service.activeManifest();
    const output = result.banners[0];
    assert.equal(output.featuredIds[0], 151006);
    assert.equal(output.entries.find((entry) => entry.id === 151006)?.name, "Featured Unit");
    assert.equal(output.entries.find((entry) => entry.id === 151006)?.ratePercent, 1.5);
    const total = output.entries.reduce((sum, entry) => sum + entry.ratePercent, 0);
    assert.ok(Math.abs(total - 100) < 0.000001);
});

test("web API exposes active runtime probability data as JSON", async () => {
    const app = Fastify();
    const service = new GachaProbabilityService(seasonal, display, new FixedClock(now));
    await app.register(createGachaProbabilityRoutes(service), { prefix: "/web_api/gacha" });
    const response = await app.inject({ method: "GET", url: "/web_api/gacha/active" });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(response.json().banners[0].entries[0].ratePercent, 1.5);
    await app.close();
});
