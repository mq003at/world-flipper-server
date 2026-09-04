import assert from "node:assert/strict";
import test from "node:test";
import type { ScheduleCatalog } from "../../src/live/schedule/schedule.catalog";
import { ScheduleService } from "../../src/live/schedule/schedule.service";
import type { SourceScheduleEntry } from "../../src/live/schedule/schedule.models";
import { SeasonTimeline } from "../../src/live/time/season-timeline";
import type { EventCatalog } from "../../src/modules/events/event-registry/event.catalog";
import { EventRegistry } from "../../src/modules/events/event-registry/event.registry";

const entries: SourceScheduleEntry[] = [{
    id: "event:rush:7",
    kind: "event",
    contentId: "rush-7",
    sourceStartAt: "2021-09-08T00:00:00Z",
    sourceEndAt: "2021-09-10T00:00:00Z",
    minimumPlayableDurationHours: 24,
    graceHours: 6,
}];
const scheduleCatalog: ScheduleCatalog = { list: () => entries };
const schedule = new ScheduleService(scheduleCatalog, new SeasonTimeline({
    seasonStartsAt: "2026-09-05T00:00:00Z",
    sourceStartsAt: "2021-09-08T00:00:00Z",
    sourceEndsAt: "2024-07-25T00:00:00Z",
    durationDays: 90,
    minimumPlayableDurationHours: 24,
    dailyResetHourUtc: 0,
    weekStartsOnUtcDay: 1,
    economy: {
        timeGatedRewardMultiplier: "compression",
        staminaCostMultiplier: "inverse-compression",
        minimumStaminaCost: 1,
    },
}));
const catalog: EventCatalog = { list: () => [{
    id: "rush-7",
    kind: "rush",
    eventId: 7,
    scheduleId: "event:rush:7",
    questRanges: [],
    shopBindings: [],
    boxGachaIds: [],
}] };

test("complex numeric event kinds are schedule-gated while unbound events remain compatibility-allowed", () => {
    const registry = new EventRegistry(catalog, schedule);
    assert.equal(registry.isNumericEventAvailable("rush", 7, new Date("2026-09-05T06:00:00Z")), true);
    assert.equal(registry.isNumericEventAvailable("rush", 7, new Date("2026-09-10T00:00:00Z")), false);
    assert.equal(registry.isNumericEventAvailable("rush", 999, new Date("2026-09-10T00:00:00Z")), true);
});
