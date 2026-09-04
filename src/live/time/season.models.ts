export interface SeasonEconomyConfig {
    timeGatedRewardMultiplier: "compression" | number;
    staminaCostMultiplier: "inverse-compression" | number;
    minimumStaminaCost: number;
}

export interface SeasonConfig {
    seasonStartsAt: string;
    sourceStartsAt: string;
    sourceEndsAt: string;
    durationDays: number;
    minimumPlayableDurationHours: number;
    dailyResetHourUtc: number;
    weekStartsOnUtcDay: number;
    economy: SeasonEconomyConfig;
}
