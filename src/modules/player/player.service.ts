import type { Clock } from "../../infrastructure/clock/clock";
import { InvariantError } from "../../shared/errors/application-error";
import { PlayerFactory } from "./player.factory";
import type { Player, PlayerSnapshot } from "./player.models";
import type { PlayerRepository } from "./player.repository";

const EXP_POOL_MAX = 100_000;

function isLaterUtcCalendarDay(current: Date, previous: Date): boolean {
    const currentKey = Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDate(),
    );
    const previousKey = Date.UTC(
        previous.getUTCFullYear(),
        previous.getUTCMonth(),
        previous.getUTCDate(),
    );
    return currentKey > previousKey;
}

export class PlayerService {
    private readonly factory: PlayerFactory;

    constructor(
        private readonly repository: PlayerRepository,
        private readonly clock: Clock,
    ) {
        this.factory = new PlayerFactory(clock);
    }

    ensurePlayer(accountId: number): Player {
        const existing = this.repository.findByAccountId(accountId);
        if (existing) return existing;

        return this.repository.createInitial(accountId, this.factory.createInitialState());
    }

    loadForAccount(accountId: number): PlayerSnapshot {
        const player = this.repository.findByAccountId(accountId);
        if (!player) throw new InvariantError("No players bound to account.");

        const now = this.clock.now();
        this.applyLoginMaintenance(player, now);

        const snapshot = this.repository.loadSnapshot(player.id);
        if (!snapshot) throw new InvariantError("No player data.");
        return snapshot;
    }

    private applyLoginMaintenance(player: Player, now: Date): void {
        const dailyReset = isLaterUtcCalendarDay(now, player.lastLoginTime);

        this.repository.updateLoginState(player.id, {
            lastLoginTime: now,
            ...(dailyReset
                ? {
                      boostPoint: 3,
                      bossBoostPoint: 3,
                      resetDailyGacha: true,
                      resetGachaCampaigns: true,
                  }
                : {}),
        });

        const elapsedSeconds = Math.max(
            0,
            Math.floor((now.getTime() - player.expPooledTime.getTime()) / 1000),
        );
        if (elapsedSeconds < 60) return;

        // Compatibility with legacy Starpoint: the regeneration increment is capped,
        // rather than capping the final pool value itself.
        const regenerated = Math.min(EXP_POOL_MAX, Math.floor(elapsedSeconds / 60));
        this.repository.updatePooledExp(player.id, player.expPool + regenerated, now);
    }
}
