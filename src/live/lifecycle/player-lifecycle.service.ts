import type { Clock } from "../../infrastructure/clock/clock";
import type { LifecyclePeriods } from "../time/lifecycle-periods";
import type { LifecycleTransition, PlayerLifecycleState } from "./player-lifecycle.models";
import type { PlayerLifecycleRepository } from "./player-lifecycle.repository";

export interface PlayerLifecycleCoordinator {
    ensureCurrent(playerId: number, now?: Date): LifecycleTransition;
}

export class PlayerLifecycleService implements PlayerLifecycleCoordinator {
    constructor(
        private readonly repository: PlayerLifecycleRepository,
        private readonly periods: LifecyclePeriods,
        private readonly clock: Clock,
    ) {}

    ensureCurrent(playerId: number, now = this.clock.now()): LifecycleTransition {
        return this.repository.transaction(() => {
            const currentDaily = this.periods.dailyKey(now);
            const currentWeekly = this.periods.weeklyKey(now);
            const currentMonthly = this.periods.monthlyKey(now);
            const existing = this.repository.find(playerId);

            const comparisonDate = existing === null ? this.repository.getLastLoginTime(playerId) : null;
            const oldDaily = existing?.dailyKey ?? (comparisonDate ? this.periods.dailyKey(comparisonDate) : currentDaily);
            const oldWeekly = existing?.weeklyKey ?? (comparisonDate ? this.periods.weeklyKey(comparisonDate) : currentWeekly);
            const oldMonthly = existing?.monthlyKey ?? (comparisonDate ? this.periods.monthlyKey(comparisonDate) : currentMonthly);

            const dailyReset = oldDaily !== currentDaily;
            const weeklyReset = oldWeekly !== currentWeekly;
            const monthlyReset = oldMonthly !== currentMonthly;
            if (dailyReset) this.repository.applyDailyReset(playerId);

            const state: PlayerLifecycleState = {
                playerId,
                dailyKey: currentDaily,
                weeklyKey: currentWeekly,
                monthlyKey: currentMonthly,
                updatedAt: now,
            };
            this.repository.upsert(state);
            return { dailyReset, weeklyReset, monthlyReset, state };
        });
    }
}
