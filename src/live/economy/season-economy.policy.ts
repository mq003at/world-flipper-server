import { RewardType, type Reward } from "../../modules/reward/reward.models";
import type { SeasonConfig } from "../time/season.models";
import type { SeasonTimeline } from "../time/season-timeline";

function positiveMultiplier(value: number): number {
    return Number.isFinite(value) && value > 0 ? value : 1;
}

export class SeasonEconomyPolicy {
    readonly timeGatedRewardMultiplier: number;
    readonly staminaCostMultiplier: number;
    readonly minimumStaminaCost: number;

    constructor(config: SeasonConfig, timeline: SeasonTimeline) {
        this.timeGatedRewardMultiplier = config.economy.timeGatedRewardMultiplier === "compression"
            ? timeline.compressionRatio
            : positiveMultiplier(config.economy.timeGatedRewardMultiplier);
        this.staminaCostMultiplier = config.economy.staminaCostMultiplier === "inverse-compression"
            ? 1 / timeline.compressionRatio
            : positiveMultiplier(config.economy.staminaCostMultiplier);
        this.minimumStaminaCost = Math.max(0, Math.trunc(config.economy.minimumStaminaCost));
    }

    resolveStaminaCost(baseCost: number): number {
        if (!Number.isFinite(baseCost) || baseCost <= 0) return 0;
        return Math.max(
            this.minimumStaminaCost,
            Math.ceil(baseCost * this.staminaCostMultiplier),
        );
    }

    scaleTimeGatedRewards(rewards: readonly Reward[]): Reward[] {
        const multiplier = this.timeGatedRewardMultiplier;
        return rewards.map((reward): Reward => {
            switch (reward.type) {
                case RewardType.ITEM:
                case RewardType.EQUIPMENT:
                    return { ...reward, count: Math.max(1, Math.round(reward.count * multiplier)) };
                case RewardType.BEADS:
                case RewardType.MANA:
                case RewardType.EXP:
                    return { ...reward, count: Math.max(0, Math.round(reward.count * multiplier)) };
                case RewardType.CHARACTER:
                    return reward;
            }
        });
    }
}
