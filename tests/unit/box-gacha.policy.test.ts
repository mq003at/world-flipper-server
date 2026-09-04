import assert from "node:assert/strict";
import test from "node:test";
import { BoxGachaRewardTier, BoxGachaRewardType, type BoxGachaBoxDefinition } from "../../src/content/master-data/box-gacha-catalog";
import type { RandomSource } from "../../src/infrastructure/random/random-source";
import { BoxGachaPolicy } from "../../src/modules/events/box-gacha/box-gacha.policy";

class FirstRandom implements RandomSource {
    nextInt(minInclusive: number, _maxExclusive: number): number { return minInclusive; }
}

const box: BoxGachaBoxDefinition = {
    boxId: 1,
    availableCount: 4,
    rewards: [
        { rewardId: 1001, type: BoxGachaRewardType.ITEM, id: 1, count: 1, available: 1, tier: BoxGachaRewardTier.FEATURED },
        { rewardId: 1002, type: BoxGachaRewardType.MANA, count: 10, available: 3, tier: BoxGachaRewardTier.COMMON },
    ],
};

test("box gacha stops immediately on featured reward", () => {
    const policy = new BoxGachaPolicy(new FirstRandom());
    const result = policy.draw(box, [], 10, true);
    assert.equal(result.actualDrawCount, 1);
    assert.deepEqual(result.drawnRewards, [{ rewardId: 1001, number: 1 }]);
});

test("box gacha never redraws exhausted reward copies", () => {
    const policy = new BoxGachaPolicy(new FirstRandom());
    const result = policy.draw(box, [{ rewardId: 1001, number: 1 }], 2, false);
    assert.equal(result.actualDrawCount, 2);
    assert.deepEqual(result.drawnRewards, [{ rewardId: 1002, number: 2 }]);
});
