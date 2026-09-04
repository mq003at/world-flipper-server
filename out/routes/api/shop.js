"use strict";
// Handles the insertion of mana into characters.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../data/utils");
const wdfpData_1 = require("../../data/wdfpData");
const assets_1 = require("../../lib/assets");
const types_1 = require("../../lib/types");
const utils_2 = require("../../utils");
const quest_1 = require("../../lib/quest");
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/buy", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        const body = request.body;
        const viewerId = body.viewer_id;
        const shopType = body.shop_type;
        const rawPurchaseAmount = body.number;
        const shopItemId = body.shop_item_id;
        if (isNaN(viewerId) || isNaN(shopType) || isNaN(rawPurchaseAmount) || isNaN(shopItemId))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        const purchaseAmount = Math.max(1, rawPurchaseAmount);
        const viewerIdSession = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!viewerIdSession)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid viewer id."
            });
        // get player
        const playerIds = yield (0, wdfpData_1.getAccountPlayers)(viewerIdSession.accountId);
        const playerId = playerIds[0];
        const player = isNaN(playerId) ? null : (0, wdfpData_1.getPlayerSync)(playerId);
        if (player === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No players bound to account."
            });
        // get the shop item's data
        const shopItemData = (0, assets_1.getShopItemSync)(shopType, shopItemId);
        if (shopItemData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Shop item with specified id does not exist."
            });
        // keep track of various stats
        const itemList = {};
        let freeVmoney = player.freeVmoney;
        let freeMana = player.freeMana;
        let bondTokens = player.bondToken;
        // verify user costs
        const userCost = shopItemData.userCost;
        if (userCost !== undefined) {
            switch (userCost.type) {
                case types_1.ShopItemUserCostType.MANA:
                    freeMana -= (userCost.amount * purchaseAmount);
                    break;
                case types_1.ShopItemUserCostType.BEADS:
                    freeVmoney -= (userCost.amount * purchaseAmount);
                    break;
                case types_1.ShopItemUserCostType.AMITY_SCROLL:
                    bondTokens -= (userCost.amount * purchaseAmount);
            }
            if (0 > freeVmoney)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Not enough beads to purchase shop item.`
                });
            if (0 > freeMana)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Not enough mana to purchase shop item.`
                });
            if (0 > bondTokens)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Not enough amity scrolls to purchase shop item.`
                });
        }
        // verify cost items
        {
            for (const cost of shopItemData.costs) {
                const itemId = cost.id;
                const itemAmount = (_a = (0, wdfpData_1.getPlayerItemSync)(playerId, itemId)) !== null && _a !== void 0 ? _a : 0;
                const newItemAmount = itemAmount - (cost.amount * purchaseAmount);
                if (0 > newItemAmount)
                    return reply.status(400).send({
                        "error": "Bad Request",
                        "message": `Not enough of item with id ${itemId} to purchase shop item.`
                    });
                itemList[itemId] = newItemAmount;
            }
            // deduct cost item
            for (const [itemId, newAmount] of Object.entries(itemList)) {
                (0, wdfpData_1.updatePlayerItemSync)(playerId, itemId, newAmount);
            }
        }
        // update player
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            freeMana: freeMana,
            freeVmoney: freeVmoney,
            bondToken: bondTokens
        });
        // build rewards array
        const rewards = [];
        for (const reward of shopItemData.rewards) {
            switch (reward.type) {
                case types_1.ShopItemRewardType.ITEM: {
                    const shopReward = reward;
                    rewards.push({
                        name: "",
                        type: types_1.RewardType.ITEM,
                        id: shopReward.id,
                        count: shopReward.count * purchaseAmount
                    });
                    break;
                }
                case types_1.ShopItemRewardType.EXP: {
                    const shopReward = reward;
                    rewards.push({
                        name: "",
                        type: types_1.RewardType.EXP,
                        count: shopReward.count * purchaseAmount
                    });
                    break;
                }
                case types_1.ShopItemRewardType.MANA: {
                    const shopReward = reward;
                    rewards.push({
                        name: "",
                        type: types_1.RewardType.MANA,
                        count: shopReward.count * purchaseAmount
                    });
                    break;
                }
                case types_1.ShopItemRewardType.CHARACTER: {
                    const shopReward = reward;
                    for (let i = 0; i < purchaseAmount; i++) {
                        rewards.push({
                            name: "",
                            type: types_1.RewardType.CHARACTER,
                            id: shopReward.id
                        });
                    }
                    break;
                }
                case types_1.ShopItemRewardType.EQUIPMENT: {
                    const shopReward = reward;
                    rewards.push({
                        name: "",
                        type: types_1.RewardType.EQUIPMENT,
                        id: shopReward.id,
                        count: shopReward.count * purchaseAmount
                    });
                    break;
                }
            }
        }
        // give rewards
        const rewardResult = (0, quest_1.givePlayerRewardsSync)(playerId, rewards);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_2.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "user_info": {
                    "free_mana": freeMana + ((_b = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.user_info.free_mana) !== null && _b !== void 0 ? _b : 0),
                    "exp_pool": player.expPool + ((_c = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.user_info.exp_pool) !== null && _c !== void 0 ? _c : 0),
                    "exp_pooled_time": (0, utils_2.getServerTime)(player.expPooledTime),
                    "bond_token": bondTokens
                },
                "joined_character_id_list": (_d = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.joined_character_id_list) !== null && _d !== void 0 ? _d : [],
                "character_list": (_e = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.character_list) !== null && _e !== void 0 ? _e : [],
                "equipment_list": (_f = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.equipment_list) !== null && _f !== void 0 ? _f : [],
                "item_list": Object.assign(Object.assign({}, itemList), ((_g = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.items) !== null && _g !== void 0 ? _g : {})),
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/get_sales_list", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _h, _j, _k;
        const body = request.body;
        const viewerId = body.viewer_id;
        const shopTypes = body.shop_types;
        const bossCoinShopCategoryIds = body.boss_coin_shop_category_ids;
        const eventList = body.event_list;
        if (isNaN(viewerId) || shopTypes === undefined || bossCoinShopCategoryIds === undefined || eventList === undefined)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        const viewerIdSession = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!viewerIdSession)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid viewer id."
            });
        // get player
        const playerIds = yield (0, wdfpData_1.getAccountPlayers)(viewerIdSession.accountId);
        const playerId = playerIds[0];
        if (isNaN(playerId))
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No players bound to account."
            });
        let toParseShopItems = {};
        // shop types
        for (const type of shopTypes) {
            const items = (0, assets_1.getGenericShopItemsSync)(type);
            const existing = (_h = toParseShopItems[type]) !== null && _h !== void 0 ? _h : {};
            toParseShopItems[type] = items === null ? existing : Object.assign(Object.assign({}, existing), items);
        }
        // event list
        for (const event of eventList) {
            const type = event.event_type;
            for (const eventId of event.event_ids) {
                const items = (0, assets_1.getEventShopItemsSync)(type, eventId);
                const existing = (_j = toParseShopItems[types_1.ShopType.EVENT_ITEM]) !== null && _j !== void 0 ? _j : {};
                toParseShopItems[types_1.ShopType.EVENT_ITEM] = items === null ? existing : Object.assign(Object.assign({}, existing), items);
            }
        }
        // boss coin shop category ids
        for (const category of bossCoinShopCategoryIds) {
            const items = (0, assets_1.getBossCoinShopItemsSync)(category);
            const existing = (_k = toParseShopItems[types_1.ShopType.BOSS_COIN]) !== null && _k !== void 0 ? _k : {};
            toParseShopItems[types_1.ShopType.BOSS_COIN] = items === null ? existing : Object.assign(Object.assign({}, existing), items);
        }
        // parse shop items
        const salesList = [];
        const now = (0, utils_2.getServerDate)().getTime();
        for (const [shopType, items] of Object.entries(toParseShopItems)) {
            for (const [itemId, item] of Object.entries(items)) {
                const from = (0, utils_1.deserializeClientDate)(item.availableFrom);
                const until = item.availableUntil === null ? null : (0, utils_1.deserializeClientDate)(item.availableUntil);
                if ((now >= from.getTime()) && (until === null || (until.getTime() > now))) {
                    salesList.push({
                        "shop_item_id": Number(itemId),
                        "stock_quantity": -1, // Change if you want a limited quantity of items. -1 = infinite.
                        "today_purchase_num": 0,
                        "this_month_purchase_num": 0,
                        "total_purchase_num": 0,
                        "group_info": {
                            "group_total_stock_quantity": -1,
                            "group_total_purchase_num": 0,
                            "multi_stage": false
                        },
                        "shop_type": Number(shopType)
                    });
                }
            }
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_2.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "sales_list": salesList
            }
        });
    }));
});
exports.default = routes;
