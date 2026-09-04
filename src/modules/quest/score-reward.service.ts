import {
    ScoreRewardType,
    type QuestCatalog,
    type RareScoreRewardDefinition,
} from "../../content/master-data/quest-catalog";
import type { RandomSource } from "../../infrastructure/random/random-source";
import { RewardType, type Reward } from "../reward/reward.models";
import type { RewardService } from "../reward/reward.service";
import type { DropRewardId, ScoreRewardResult } from "./quest.models";

function rareRewardToReward(raw: RareScoreRewardDefinition): Reward | null {
    switch (raw.type) {
        case RewardType.ITEM:
        case RewardType.EQUIPMENT:
            return raw.id === undefined || raw.count === undefined
                ? null
                : { type: raw.type, id: raw.id, count: raw.count };
        case RewardType.CHARACTER:
            return raw.id === undefined ? null : { type: RewardType.CHARACTER, id: raw.id };
        case RewardType.BEADS:
        case RewardType.MANA:
        case RewardType.EXP:
            return raw.count === undefined ? null : { type: raw.type, count: raw.count };
        default:
            // The extracted rare reward table also contains legacy types (6/7)
            // that the old Starpoint reward switch ignored. Keep them as no-op drops.
            return null;
    }
}

function rewardNumber(raw: RareScoreRewardDefinition): number {
    if (raw.type === RewardType.CHARACTER) return 1;
    return raw.count ?? 0;
}

export class ScoreRewardService {
    constructor(
        private readonly catalog: QuestCatalog,
        private readonly rewardService: RewardService,
        private readonly random: RandomSource,
    ) {}

    grant(
        playerId: number,
        scoreRewardGroupId: number | undefined,
        boostPointUsed: boolean,
    ): ScoreRewardResult {
        if (scoreRewardGroupId === undefined) {
            return { grant: null, dropScoreRewardIds: [], dropRareRewardIds: [] };
        }

        const rewards: Reward[] = [];
        const dropScoreRewardIds: DropRewardId[] = [];
        const dropRareRewardIds: DropRewardId[] = [];
        const group = this.catalog.getScoreRewardGroup(scoreRewardGroupId);

        for (let index = 0; index < group.length; index += 1) {
            const scoreReward = group[index];
            if (scoreReward.type === ScoreRewardType.ITEM) {
                const amount = scoreReward.count * 10 * (boostPointUsed ? 2 : 1);
                switch (scoreReward.rewardType) {
                    case RewardType.ITEM:
                        if (scoreReward.id !== undefined) {
                            rewards.push({
                                type: RewardType.ITEM,
                                id: scoreReward.id,
                                count: amount,
                            });
                        }
                        break;
                    case RewardType.MANA:
                        rewards.push({ type: RewardType.MANA, count: amount });
                        break;
                    case RewardType.EXP:
                        rewards.push({ type: RewardType.EXP, count: amount });
                        break;
                    default:
                        break;
                }

                dropScoreRewardIds.push({
                    group_id: scoreRewardGroupId,
                    index: index + 1,
                    number: amount,
                });
                continue;
            }

            // Preserve the old server's probability granularity: randomInt(0, 100) / 100.
            const roll = this.random.nextInt(0, 100) / 100;
            if (scoreReward.rarity < roll) continue;

            const rareGroup = this.catalog.getRareScoreRewardGroup(scoreReward.id);
            if (rareGroup.length === 0) continue;
            const selectedIndex = this.random.nextInt(0, rareGroup.length);
            const selected = rareGroup[selectedIndex];
            const reward = rareRewardToReward(selected);
            if (reward) rewards.push(reward);

            dropRareRewardIds.push({
                group_id: scoreReward.id,
                index: selectedIndex + 1,
                number: rewardNumber(selected),
            });
        }

        return {
            grant: rewards.length === 0 ? null : this.rewardService.grant(playerId, rewards),
            dropScoreRewardIds,
            dropRareRewardIds,
        };
    }
}
