import { readFileSync } from "node:fs";
import path from "node:path";
import { InvariantError } from "../../shared/errors/application-error";
import {
    BoxGachaRewardTier,
    BoxGachaRewardType,
    type BoxGachaBoxDefinition,
    type BoxGachaCatalog,
    type BoxGachaDefinition,
    type BoxGachaRewardDefinition,
} from "./box-gacha-catalog";

type RawBoxGacha = {
    itemId: number;
    count: number;
    availableCounts: Record<string, number>;
};
type RawBoxGachas = Record<string, RawBoxGacha>;
type RawReward = { type: number; count: number; available: number; tier: number; id?: number };
type RawBoxRewards = Record<string, Record<string, Record<string, RawReward>>>;

function requireInteger(value: unknown, label: string, min = 0): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) {
        throw new InvariantError(`Invalid ${label} master data.`);
    }
    return value;
}

export class JsonBoxGachaCatalog implements BoxGachaCatalog {
    private readonly definitions: Map<number, BoxGachaDefinition>;

    constructor(masterDataDir: string) {
        let gachas: RawBoxGachas;
        let rewards: RawBoxRewards;
        try {
            gachas = JSON.parse(readFileSync(path.join(masterDataDir, "box_gacha.json"), "utf8")) as RawBoxGachas;
            rewards = JSON.parse(readFileSync(path.join(masterDataDir, "box_reward.json"), "utf8")) as RawBoxRewards;
        } catch (error) {
            throw new InvariantError(`Unable to load box gacha master data: ${String(error)}`);
        }

        this.definitions = new Map(Object.entries(gachas).map(([rawGachaId, raw]) => {
            const id = Number(rawGachaId);
            const rewardBoxes = rewards[rawGachaId];
            if (!rewardBoxes) throw new InvariantError(`Box gacha ${id} has no reward master data.`);
            const boxes: BoxGachaBoxDefinition[] = Object.entries(rewardBoxes).map(([rawBoxId, box]) => {
                const boxId = Number(rawBoxId);
                const parsedRewards: BoxGachaRewardDefinition[] = Object.entries(box).map(([rawRewardId, reward]) => {
                    const type = requireInteger(reward.type, `box reward ${rawRewardId} type`) as BoxGachaRewardType;
                    if (type < BoxGachaRewardType.ITEM || type > BoxGachaRewardType.CHARACTER) {
                        throw new InvariantError(`Invalid box reward ${rawRewardId} type.`);
                    }
                    const tier = requireInteger(reward.tier, `box reward ${rawRewardId} tier`) as BoxGachaRewardTier;
                    if (tier < BoxGachaRewardTier.COMMON || tier > BoxGachaRewardTier.FEATURED) {
                        throw new InvariantError(`Invalid box reward ${rawRewardId} tier.`);
                    }
                    return {
                        rewardId: Number(rawRewardId),
                        type,
                        count: requireInteger(reward.count, `box reward ${rawRewardId} count`, 1),
                        available: requireInteger(reward.available, `box reward ${rawRewardId} available`, 1),
                        tier,
                        ...(reward.id === undefined
                            ? {}
                            : { id: requireInteger(reward.id, `box reward ${rawRewardId} id`, 1) }),
                    };
                });
                const derivedCount = parsedRewards.reduce((sum, reward) => sum + reward.available, 0);
                return {
                    boxId,
                    availableCount: raw.availableCounts[rawBoxId] ?? derivedCount,
                    rewards: parsedRewards,
                };
            });
            return [id, {
                id,
                redeemItemId: requireInteger(raw.itemId, `box gacha ${id} redeem item id`, 1),
                redeemItemCount: requireInteger(raw.count, `box gacha ${id} redeem item count`, 1),
                boxes,
            }];
        }));
    }

    findById(id: number): BoxGachaDefinition | null {
        return this.definitions.get(id) ?? null;
    }
}
