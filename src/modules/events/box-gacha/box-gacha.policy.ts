import {
    BoxGachaRewardTier,
    type BoxGachaBoxDefinition,
    type BoxGachaRewardDefinition,
} from "../../../content/master-data/box-gacha-catalog";
import type { RandomSource } from "../../../infrastructure/random/random-source";
import type { DrawnBoxRewardState } from "./box-gacha.models";

export interface BoxDrawSession {
    drawnRewards: DrawnBoxRewardState[];
    actualDrawCount: number;
}

export class BoxGachaPolicy {
    constructor(private readonly random: RandomSource) {}

    draw(
        box: BoxGachaBoxDefinition,
        alreadyDrawn: readonly DrawnBoxRewardState[],
        requestedDrawCount: number,
        stopOnFeaturedReward: boolean,
    ): BoxDrawSession {
        const previouslyDrawn = new Map(alreadyDrawn.map((entry) => [entry.rewardId, entry.number]));
        const remaining = box.rewards.map((reward) => ({
            reward,
            remaining: Math.max(0, reward.available - (previouslyDrawn.get(reward.rewardId) ?? 0)),
        }));
        const session = new Map<number, number>();
        let actualDrawCount = 0;

        for (let drawIndex = 0; drawIndex < requestedDrawCount; drawIndex += 1) {
            const totalRemaining = remaining.reduce((sum, entry) => sum + entry.remaining, 0);
            if (totalRemaining <= 0) break;
            let roll = this.random.nextInt(0, totalRemaining);
            let selected: { reward: BoxGachaRewardDefinition; remaining: number } | null = null;
            for (const entry of remaining) {
                if (entry.remaining <= 0) continue;
                if (roll < entry.remaining) {
                    selected = entry;
                    break;
                }
                roll -= entry.remaining;
            }
            if (!selected) break;
            selected.remaining -= 1;
            session.set(selected.reward.rewardId, (session.get(selected.reward.rewardId) ?? 0) + 1);
            actualDrawCount += 1;
            if (stopOnFeaturedReward && selected.reward.tier === BoxGachaRewardTier.FEATURED) break;
        }

        return {
            drawnRewards: [...session.entries()].map(([rewardId, number]) => ({ rewardId, number })),
            actualDrawCount,
        };
    }
}
