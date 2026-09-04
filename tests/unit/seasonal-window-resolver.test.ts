import assert from "node:assert/strict";
import test from "node:test";
import { parseSourceTimestamp, SeasonalWindowResolver } from "../../src/live/schedule/seasonal-window-resolver";
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

test("source timestamps without offsets are parsed deterministically as UTC", () => {
    assert.equal(
        parseSourceTimestamp("2022-01-01 12:34:56")?.toISOString(),
        "2022-01-01T12:34:56.000Z",
    );
});

test("seasonal master windows accelerate release dates but keep the minimum playable duration", () => {
    const resolver = new SeasonalWindowResolver(new SeasonTimeline(config));
    const window = resolver.resolve("2022-01-01 00:00:00", "2022-01-15 00:00:00");
    assert.ok(window);
    const hours = (window.activeUntil!.getTime() - window.releaseAt.getTime()) / 3_600_000;
    assert.equal(hours, 72);
});

test("malformed legacy window data is compatibility-allowed instead of disabling content", () => {
    const resolver = new SeasonalWindowResolver(new SeasonTimeline(config));
    assert.equal(resolver.isActive("not-a-date", null, new Date("2026-09-10T00:00:00Z")), true);
});
