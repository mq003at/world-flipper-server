import assert from "node:assert/strict";
import test from "node:test";
import { ScheduleService } from "../../src/live/schedule/schedule.service";
import { SeasonTimeline } from "../../src/live/time/season-timeline";
import type { ScheduleCatalog } from "../../src/live/schedule/schedule.catalog";
import type { SourceScheduleEntry } from "../../src/live/schedule/schedule.models";
import type { EventCatalog } from "../../src/modules/events/event-registry/event.catalog";
import { EventRegistry } from "../../src/modules/events/event-registry/event.registry";

const scheduleEntries: SourceScheduleEntry[] = [{
    id: "event:story:1",
    kind: "event",
    contentId: "story-1",
    sourceStartAt: "2021-09-08T00:00:00Z",
    sourceEndAt: "2021-09-15T00:00:00Z",
    minimumPlayableDurationHours: 72,
    graceHours: 24,
}];

const scheduleCatalog: ScheduleCatalog = { list: () => scheduleEntries };
const timeline = new SeasonTimeline({
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
});
const schedule = new ScheduleService(scheduleCatalog, timeline);
const eventCatalog: EventCatalog = {
    list: () => [{
        id: "story-event-1",
        kind: "story",
        eventId: 1,
        scheduleId: "event:story:1",
        questRanges: [{ category: 10, minQuestId: 100001000, maxQuestId: 100001999 }],
        shopBindings: [{ eventType: 10, eventId: 1 }],
        boxGachaIds: [1],
    }],
};

test("event registry gates only explicitly bound content", () => {
    const registry = new EventRegistry(eventCatalog, schedule);
    const active = new Date("2026-09-05T12:00:00Z");
    const inactive = new Date("2026-09-20T00:00:00Z");
    assert.equal(registry.isQuestStartAvailable(10, 100001001, active), true);
    assert.equal(registry.isEventShopAvailable(10, 1, active), true);
    assert.equal(registry.isBoxGachaAvailable(1, active), true);
    assert.equal(registry.isQuestStartAvailable(10, 100001001, inactive), false);
    assert.equal(registry.isEventShopAvailable(10, 1, inactive), false);
    assert.equal(registry.isBoxGachaAvailable(1, inactive), false);
    assert.equal(registry.isQuestStartAvailable(1, 1001002, inactive), true);
});
