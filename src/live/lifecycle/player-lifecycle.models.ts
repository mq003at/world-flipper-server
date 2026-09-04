export interface PlayerLifecycleState {
    playerId: number;
    dailyKey: string;
    weeklyKey: string;
    monthlyKey: string;
    updatedAt: Date;
}

export interface LifecycleTransition {
    dailyReset: boolean;
    weeklyReset: boolean;
    monthlyReset: boolean;
    state: PlayerLifecycleState;
}
