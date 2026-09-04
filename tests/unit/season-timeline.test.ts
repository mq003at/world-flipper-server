import assert from "node:assert/strict";
import test from "node:test";
import { SeasonEconomyPolicy } from "../../src/live/economy/season-economy.policy";
import { SeasonTimeline } from "../../src/live/time/season-timeline";
import type { SeasonConfig } from "../../src/live/time/season.models";

const config: SeasonConfig = {
    seasonStartsAt: "2026-09-05T00:00:00Z",
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
};

test("maps the original lifecycle into a 90-day season without speeding lifecycle days", () => {
    const timeline = new SeasonTimeline(config);
    assert.ok(timeline.compressionRatio > 11 && timeline.compressionRatio < 12);
    assert.equal(timeline.mapSourceDate(timeline.sourceStartsAt).toISOString(), timeline.seasonStartsAt.toISOString());
    assert.equal(timeline.mapSourceDate(timeline.sourceEndsAt).toISOString(), timeline.seasonEndsAt.toISOString());
});

test("option B reduces stamina cost using inverse content compression", () => {
    const timeline = new SeasonTimeline(config);
    const economy = new SeasonEconomyPolicy(config, timeline);
    assert.equal(economy.resolveStaminaCost(20), 2);
    assert.equal(economy.resolveStaminaCost(10), 1);
});
