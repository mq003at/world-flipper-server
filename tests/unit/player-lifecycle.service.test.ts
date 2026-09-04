import assert from "node:assert/strict";
import test from "node:test";
import type { Clock } from "../../src/infrastructure/clock/clock";
import type { PlayerLifecycleState } from "../../src/live/lifecycle/player-lifecycle.models";
import type { PlayerLifecycleRepository } from "../../src/live/lifecycle/player-lifecycle.repository";
import { PlayerLifecycleService } from "../../src/live/lifecycle/player-lifecycle.service";
import { LifecyclePeriods } from "../../src/live/time/lifecycle-periods";

class FixedClock implements Clock {
    constructor(private value: Date) {}
    now(): Date { return new Date(this.value); }
    set(value: Date): void { this.value = value; }
}

class FakeRepository implements PlayerLifecycleRepository {
    state: PlayerLifecycleState | null = null;
    lastLogin: Date | null = null;
    dailyResets = 0;

    find(): PlayerLifecycleState | null { return this.state; }
    getLastLoginTime(): Date | null { return this.lastLogin; }
    upsert(state: PlayerLifecycleState): void { this.state = state; }
    applyDailyReset(): void { this.dailyResets += 1; }
    transaction<T>(work: () => T): T { return work(); }
}

test("lifecycle remains real-time and performs a daily reset only after crossing the configured boundary", () => {
    const clock = new FixedClock(new Date("2026-09-05T03:59:00Z"));
    const repository = new FakeRepository();
    repository.lastLogin = new Date("2026-09-05T03:30:00Z");
    const service = new PlayerLifecycleService(repository, new LifecyclePeriods(4, 1), clock);

    const before = service.ensureCurrent(10);
    assert.equal(before.dailyReset, false);
    assert.equal(repository.dailyResets, 0);

    clock.set(new Date("2026-09-05T04:01:00Z"));
    const after = service.ensureCurrent(10);
    assert.equal(after.dailyReset, true);
    assert.equal(repository.dailyResets, 1);

    const repeat = service.ensureCurrent(10);
    assert.equal(repeat.dailyReset, false);
    assert.equal(repository.dailyResets, 1);
});

test("monthly and weekly period changes are reported without multiplying lifecycle time by content compression", () => {
    const clock = new FixedClock(new Date("2026-10-01T05:00:00Z"));
    const repository = new FakeRepository();
    repository.state = {
        playerId: 10,
        dailyKey: "2026-09-30",
        weeklyKey: "week:2026-09-28",
        monthlyKey: "month:2026-09",
        updatedAt: new Date("2026-09-30T05:00:00Z"),
    };
    const service = new PlayerLifecycleService(repository, new LifecyclePeriods(4, 1), clock);
    const transition = service.ensureCurrent(10);
    assert.equal(transition.dailyReset, true);
    assert.equal(transition.monthlyReset, true);
    assert.equal(transition.weeklyReset, false);
});
