import type { InitialPlayerState, Player, PlayerSnapshot } from "./player.models";

export interface PlayerRepository {
    findById(playerId: number): Player | null;
    findByAccountId(accountId: number): Player | null;
    createInitial(accountId: number, state: InitialPlayerState): Player;
    loadSnapshot(playerId: number): PlayerSnapshot | null;

    updateLoginState(
        playerId: number,
        changes: {
            lastLoginTime: Date;
            boostPoint?: number;
            bossBoostPoint?: number;
            resetDailyGacha?: boolean;
            resetGachaCampaigns?: boolean;
        },
    ): void;

    updatePooledExp(playerId: number, expPool: number, expPooledTime: Date): void;

    transaction<T>(work: () => T): T;
}
