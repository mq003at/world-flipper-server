import assert from "node:assert/strict";
import test from "node:test";
import { GachaType, type GachaDefinition } from "../../src/content/master-data/gacha-catalog";
import type { RandomSource } from "../../src/infrastructure/random/random-source";
import { drawGachaIds } from "../../src/modules/gacha/gacha.policy";

class TailRandom implements RandomSource {
    nextInt(_minInclusive: number, maxExclusive: number): number {
        return maxExclusive - 1;
    }
}

const gacha: GachaDefinition = {
    id: 1,
    type: GachaType.CHARACTER,
    paymentType: 1,
    singleCost: 150,
    multiCost: 1500,
    discountCost: 50,
    startDate: "",
    endDate: "",
    movieName: "normal",
    guaranteeMovieName: "normal_guarantee",
    pool: {
        1: [{ id: 500001, rank: 5, odds: 0, isRateUp: false, weight: 1000 }],
        2: [{ id: 400001, rank: 4, odds: 0, isRateUp: false, weight: 1000 }],
        3: [{ id: 300001, rank: 3, odds: 0, isRateUp: false, weight: 1000 }],
    },
};

test("the 10th draw uses the guaranteed 4-star-or-better rank table", () => {
    const draws = drawGachaIds(new TailRandom(), gacha, 10);
    assert.equal(draws.length, 10);
    assert.equal(draws[8], 300001);
    assert.equal(draws[9], 400001);
});
