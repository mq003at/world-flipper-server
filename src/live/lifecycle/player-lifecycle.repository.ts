import type { PlayerLifecycleState } from "./player-lifecycle.models";

export interface PlayerLifecycleRepository {
    find(playerId: number): PlayerLifecycleState | null;
    getLastLoginTime(playerId: number): Date | null;
    upsert(state: PlayerLifecycleState): void;
    applyDailyReset(playerId: number): void;
    transaction<T>(work: () => T): T;
}
