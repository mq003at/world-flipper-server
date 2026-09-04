"use strict";
/**
 * Handles gacha summoning.
 * Right now all characters in a gacha's pool have an equal chance of being summoned.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardPlayerBoxGachaResultSync = exports.drawBoxGachaSync = exports.rewardPlayerGachaDrawResultSync = exports.drawGachaSync = exports.randomPoolItem = void 0;
const crypto_1 = require("crypto");
const gacha_movie_seeds_json_1 = __importDefault(require("../../assets/gacha_movie_seeds.json"));
const gacha_rate_up_movie_seeds_json_1 = __importDefault(require("../../assets/gacha_rate_up_movie_seeds.json"));
const character_1 = require("./character");
const equipment_1 = require("./equipment");
const quest_1 = require("./quest");
const types_1 = require("./types");
const characterGachaRankRates = {
    normal: [
        75, // 5*
        250, // 4*
        675 // 3*
    ],
    multiGuarantee: [
        75, // 5*
        925 // 4*
    ]
};
const rateUpCharacterGachaRates = {
    normal: [
        50, // 5*
        250, // 4*,
        700, // 3*
    ],
    multiGuarantee: [
        50, // 5*
        950 // 4*
    ],
};
const equipmentGachaRankRates = {
    normal: [
        50, // 5*
        250, // 4*
        700 // 3*
    ],
    multiGuarantee: [
        50, // 5*
        950 // 4*
    ]
};
const rankMovieRates = [
    [
        80,
        20
    ],
    [
        80,
        20
    ],
    [
        100
    ]
];
/**
 * Selects a random index from a weighted pool.
 *
 * @param min The minimum random value to pick.
 * @param max The maximum random value to pick.
 * @param pool The pool to select the random index from.
 * @returns The index that was selected. null if nothing was selected.
 */
function randomPoolItem(min, max, pool) {
    let roll = (0, crypto_1.randomInt)(min, max);
    let offset = 0;
    let index = 0;
    for (const rate of pool) {
        if ((rate + offset) >= roll)
            return index;
        offset += rate;
        index += 1;
    }
    return null;
}
exports.randomPoolItem = randomPoolItem;
function drawGachaSync(gacha, drawAmount) {
    var _a, _b, _c;
    const isCharacterGacha = gacha.type === types_1.GachaType.CHARACTER;
    const isRateUp = isCharacterGacha ? gacha.movieName !== "normal" : false;
    const rankRates = isCharacterGacha ? (isRateUp ? rateUpCharacterGachaRates : characterGachaRankRates) : equipmentGachaRankRates;
    const pulls = new Map();
    for (let drawNumber = 0; drawNumber < drawAmount; drawNumber++) {
        const drawRankRates = (drawNumber !== 0) && ((drawNumber % 9) === 0) ? rankRates.multiGuarantee : rankRates.normal;
        const ratePool = gacha.pool[((_a = randomPoolItem(0, 1001, drawRankRates)) !== null && _a !== void 0 ? _a : 0) + 1];
        // pick item from pool
        const selectedItem = ratePool[(_b = randomPoolItem(0, 1001, ratePool.map(item => item.rarity))) !== null && _b !== void 0 ? _b : 0];
        const selectedItemId = selectedItem.id;
        pulls.set(selectedItemId, ((_c = pulls.get(selectedItemId)) !== null && _c !== void 0 ? _c : 0) + 1);
    }
    return pulls;
}
exports.drawGachaSync = drawGachaSync;
function rewardPlayerGachaDrawResultSync(playerId, gacha, gachaDrawResult) {
    var _a, _b, _c;
    const draws = [];
    const characters = new Map();
    const equipment = new Map();
    const items = new Map();
    if (gacha.type == types_1.GachaType.CHARACTER) {
        const characterGacha = gacha;
        // reward characters
        for (const [characterId, amount] of gachaDrawResult) {
            for (let n = 0; n < amount; n++) {
                const giveResult = (0, character_1.givePlayerCharacterSync)(playerId, characterId);
                if (giveResult !== null) {
                    // get character rarity
                    const rarity = Math.floor(characterId / 100000) - 1;
                    // decide on movie
                    const movieType = (_a = randomPoolItem(1, 101, rankMovieRates[rarity])) !== null && _a !== void 0 ? _a : types_1.GachaMovieType.NORMAL;
                    // pick a seed
                    const isRateUp = gacha.movieName !== "normal";
                    const seeds = (isRateUp ? gacha_rate_up_movie_seeds_json_1.default : gacha_movie_seeds_json_1.default)[rarity + 1][movieType];
                    const seedIndex = (0, crypto_1.randomInt)(0, seeds.length + 1);
                    // build draw
                    const draw = {
                        "character_id": characterId,
                        "movie_id": movieType === types_1.GachaMovieType.NORMAL ? characterGacha.movieName : characterGacha.guaranteeMovieName,
                        "seed": (_b = seeds[seedIndex]) !== null && _b !== void 0 ? _b : seeds[0],
                        "entry_count": 1
                    };
                    // set values in items map, characters map, and draws array.
                    const giveItem = giveResult.item;
                    if (giveItem !== undefined) {
                        draw['ex_boost_item'] = giveItem; // add ex_boost_item to draw
                        items.set(giveItem.id, ((_c = items.get(giveItem.id)) !== null && _c !== void 0 ? _c : 0) + giveItem.count);
                    }
                    const existingCharacter = characters.get(characterId);
                    if (existingCharacter) {
                        characters.set(characterId, Object.assign(Object.assign({}, existingCharacter), giveResult.character));
                    }
                    else {
                        characters.set(characterId, giveResult.character);
                    }
                    draws.push(draw);
                }
            }
        }
    }
    else {
        for (const [equipmentId, amount] of gachaDrawResult) {
            const giveResult = (0, equipment_1.givePlayerEquipmentSync)(playerId, equipmentId, amount);
            equipment.set(equipmentId, giveResult);
            for (let i = 0; i < amount; i++) {
                draws.push({
                    "equipment_id": equipmentId,
                    "treasure_up_type": 0
                });
            }
        }
    }
    const returnCharacters = [];
    for (const value of characters.values()) {
        returnCharacters.push(value);
    }
    const returnEquipment = [];
    for (const value of equipment.values()) {
        returnEquipment.push(value);
    }
    const returnItems = {};
    for (const [itemId, amount] of items) {
        returnItems[itemId] = amount;
    }
    return {
        draw: draws,
        characters: returnCharacters,
        equipment: returnEquipment,
        items: returnItems
    };
}
exports.rewardPlayerGachaDrawResultSync = rewardPlayerGachaDrawResultSync;
/**
 * Performs box gacha draws.
 *
 * @param rewards A record, where the key is the reward id and the value is a BoxGachaReward
 * @param drawnRewards The current draws the player has made on the box gacha.
 * @param drawAmount The number of draws to perform.
 */
function drawBoxGachaSync(rewards, drawnRewards, drawAmount, // the number of times to draw
stopOnFeaturedReward = false) {
    var _a, _b, _c, _d, _e;
    // build drawn reward map
    const drawnRewardsMap = new Map(drawnRewards.map(reward => [reward.id, reward.number]));
    const rewardsPool = [];
    for (const [rewardId, reward] of Object.entries(rewards)) {
        for (let i = 0; i < (reward.available - ((_a = drawnRewardsMap.get(Number(rewardId))) !== null && _a !== void 0 ? _a : 0)); i++) {
            rewardsPool.push(rewardId);
        }
    }
    let drawnMana = 0;
    let drawnExp = 0;
    const drawnCharacters = new Map();
    const drawnEquipment = new Map();
    const drawnItems = new Map();
    const sessionDrawnRewards = new Map();
    let totalDraws = 0;
    for (let n = 0; n < drawAmount && rewardsPool.length > 0; n++) {
        const rollIndex = (0, crypto_1.randomInt)(rewardsPool.length);
        const rewardId = rewardsPool[rollIndex];
        const reward = rewards[rewardId];
        switch (reward.type) {
            case types_1.BoxGachaRewardType.ITEM: {
                const itemId = reward.id;
                drawnItems.set(itemId, ((_b = drawnItems.get(itemId)) !== null && _b !== void 0 ? _b : 0) + reward.count);
                break;
            }
            case types_1.BoxGachaRewardType.EQUIPMENT: {
                const equipmentId = reward.id;
                drawnEquipment.set(equipmentId, ((_c = drawnEquipment.get(equipmentId)) !== null && _c !== void 0 ? _c : 0) + reward.count);
                break;
            }
            case types_1.BoxGachaRewardType.MANA: {
                drawnMana += reward.count;
                break;
            }
            case types_1.BoxGachaRewardType.EXP: {
                drawnExp += reward.count;
                break;
            }
            case types_1.BoxGachaRewardType.CHARACTER: {
                const characterId = reward.id;
                drawnCharacters.set(characterId, ((_d = drawnCharacters.get(characterId)) !== null && _d !== void 0 ? _d : 0) + reward.count);
                break;
            }
        }
        sessionDrawnRewards.set(rewardId, ((_e = sessionDrawnRewards.get(rewardId)) !== null && _e !== void 0 ? _e : 0) + 1);
        rewardsPool.splice(rollIndex, 1);
        totalDraws += 1;
        // break if the reward was featured & stop of featured is enabled
        if (reward.tier == types_1.BoxGachaRewardTier.FEATURED && stopOnFeaturedReward)
            break;
    }
    // return the draw result
    const returnSessionDrawnRewards = [];
    sessionDrawnRewards.forEach((value, rewardId) => {
        returnSessionDrawnRewards.push({
            id: Number(rewardId),
            number: value
        });
    });
    return {
        mana: drawnMana,
        exp: drawnExp,
        characters: drawnCharacters,
        equipment: drawnEquipment,
        items: drawnItems,
        rewards: returnSessionDrawnRewards
    };
}
exports.drawBoxGachaSync = drawBoxGachaSync;
/**
 * Rewards a player with the results of a box gacha draw.
 *
 * @param playerId The ID of the player.
 * @param drawResult The box gacha draw result.
 * @returns A PlayerRewardResult.
 */
function rewardPlayerBoxGachaResultSync(playerId, drawResult) {
    const rewards = [];
    // convert draw results into rewards
    // items
    for (const [itemId, number] of drawResult.items) {
        rewards.push({
            name: '',
            type: types_1.RewardType.ITEM,
            id: itemId,
            count: number
        });
    }
    // equipment
    for (const [equipmentId, number] of drawResult.equipment) {
        rewards.push({
            name: '',
            type: types_1.RewardType.EQUIPMENT,
            id: equipmentId,
            count: number
        });
    }
    // characters
    for (const [characterId, number] of drawResult.characters) {
        for (let i = 0; i < number; i++) {
            rewards.push({
                name: '',
                type: types_1.RewardType.CHARACTER,
                id: characterId,
            });
        }
    }
    // mana & exp
    rewards.push({
        name: '',
        type: types_1.RewardType.EXP,
        count: drawResult.exp,
    });
    rewards.push({
        name: '',
        type: types_1.RewardType.MANA,
        count: drawResult.mana,
    });
    return (0, quest_1.givePlayerRewardsSync)(playerId, rewards);
}
exports.rewardPlayerBoxGachaResultSync = rewardPlayerBoxGachaResultSync;
