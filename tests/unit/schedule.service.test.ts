import assert from "node:assert/strict";
import test from "node:test";
import { ScheduleService } from "../../src/live/schedule/schedule.service";
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

test("release cadence is compressed while playable windows keep a human-scale minimum", () => {
    const catalog = {
        list: () => [{
            id: "event:test",
            kind: "event" as const,
            contentId: "1",
            sourceStartAt: "2022-01-01T00:00:00Z",
            sourceEndAt: "2022-01-15T00:00:00Z",
        }],
    };
    const service = new ScheduleService(catalog, new SeasonTimeline(config));
    const entry = service.get("event:test");
    assert.ok(entry);
    const hours = (entry.activeUntil.getTime() - entry.releaseAt.getTime()) / 3_600_000;
    assert.equal(hours, 72);
});
