import type { Clock } from "../../infrastructure/clock/clock";
import { LifecyclePeriods } from "../../live/time/lifecycle-periods";
import type { PlayerLifecycleCoordinator } from "../../live/lifecycle/player-lifecycle.service";
import { InvariantError } from "../../shared/errors/application-error";
import { PlayerFactory } from "./player.factory";
import type { Player, PlayerSnapshot } from "./player.models";
import type { PlayerRepository } from "./player.repository";
import type { SeasonRolloverCoordinator } from "../gacha/season-rollover.service";

const EXP_POOL_MAX = 100_000;

export class PlayerService {
    private readonly factory: PlayerFactory;

    constructor(
        private readonly repository: PlayerRepository,
        private readonly clock: Clock,
        private readonly lifecycle: LifecyclePeriods = new LifecyclePeriods(0, 1),
        private readonly lifecycleCoordinator?: PlayerLifecycleCoordinator,
        private readonly seasonRollover?: SeasonRolloverCoordinator,
        initialStarCrumb = 2100,
    ) {
        this.factory = new PlayerFactory(clock, initialStarCrumb);
    }

    ensurePlayer(accountId: number): Player {
        const existing = this.repository.findByAccountId(accountId);
        if (existing) return existing;

        return this.repository.createInitial(accountId, this.factory.createInitialState());
    }

    requireForAccount(accountId: number): Player {
        const player = this.repository.findByAccountId(accountId);
        if (!player) throw new InvariantError("No player bound to account.");
        this.seasonRollover?.ensureCurrent(player.id, this.clock.now());
        this.lifecycleCoordinator?.ensureCurrent(player.id, this.clock.now());
        return player;
    }

    loadForAccount(accountId: number): PlayerSnapshot {
        const player = this.repository.findByAccountId(accountId);
        if (!player) throw new InvariantError("No players bound to account.");

        const now = this.clock.now();
        this.seasonRollover?.ensureCurrent(player.id, now);
        this.lifecycleCoordinator?.ensureCurrent(player.id, now);
        this.applyLoginMaintenance(player, now);

        const snapshot = this.repository.loadSnapshot(player.id);
        if (!snapshot) throw new InvariantError("No player data.");
        return snapshot;
    }

    private applyLoginMaintenance(player: Player, now: Date): void {
        if (this.lifecycleCoordinator) {
            this.repository.updateLoginState(player.id, { lastLoginTime: now });
        } else {
            const dailyReset = this.lifecycle.dailyKey(now) !== this.lifecycle.dailyKey(player.lastLoginTime);
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
        }

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
