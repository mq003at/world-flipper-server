"use strict";
// Handles EX boosts for characters.
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
const wdfpData_1 = require("../../data/wdfpData");
const assets_1 = require("../../lib/assets");
const utils_1 = require("../../utils");
const crypto_1 = require("crypto");
const utils_2 = require("../../data/utils");
const character_1 = require("../../lib/character");
const character_2 = require("./character");
const tierAbilityIdCounts = {
    [1]: [0, 2],
    [2]: [0, 2],
    [3]: [2, 2]
};
const tierAbilityTierRates = {
    [1]: [70, 20, 10],
    [2]: [0, 80, 20],
    [3]: [0, 0, 100]
};
const playerDraws = {};
const drawExpBoost = (request, reply, autoAccept) => __awaiter(void 0, void 0, void 0, function* () {
    const body = request.body;
    const viewerId = body.viewer_id;
    const characterId = body.character_id;
    const costItemId = body.cost_item_id;
    if (isNaN(viewerId) || isNaN(characterId) || isNaN(costItemId))
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
    // get player character data
    const characterData = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
    if (characterData === null)
        return reply.status(400).send({
            "error": "Bad Request",
            "message": "Player does not own character."
        });
    // get character asset data
    const characterAssetData = (0, assets_1.getCharacterDataSync)(characterId);
    if (!characterAssetData)
        return reply.status(500).send({
            "error": "Internal Server Error",
            "message": "Character does not have data."
        });
    // get ex boost item data
    const costItemData = (0, assets_1.getExBoostItemSync)(costItemId);
    if (!costItemData)
        return reply.status(400).send({
            "error": "Bad Request",
            "message": "Attempt to use invalid cost item."
        });
    // check if the element is correct
    if ((costItemData.element !== undefined) && (costItemData.element !== characterAssetData.element))
        return reply.status(400).send({
            "error": "Bad Request",
            "message": "Attempt to use wrong item with different element from character."
        });
    // make sure that the player has enough of the item
    const costItemAmount = (0, wdfpData_1.getPlayerItemSync)(playerId, costItemId);
    if (costItemAmount === null)
        return reply.status(400).send({
            "error": "Bad Request",
            "message": "You do not own item."
        });
    const afterCostItemAmount = costItemAmount - costItemData.count;
    if (0 > afterCostItemAmount)
        return reply.status(400).send({
            "error": "Bad Request",
            "message": "Not enough of item."
        });
    // ensure that the requested character is level 100
    const rarity = characterAssetData.rarity;
    if (character_1.characterExpCaps[rarity][character_2.characterMaxOverLimits[rarity]] > characterData.exp)
        return reply.status(400).send({
            "error": "Bad Request",
            "message": "Character not level 100."
        });
    // get the status pools
    const drawTier = costItemData.tier;
    const exStatusPool = (0, assets_1.getExStatusPoolSync)(drawTier);
    if (exStatusPool === null)
        return reply.status(500).send({
            "error": "Internal Server Error",
            "message": "Pool not found."
        });
    // get the ability pools
    const abilityPools = structuredClone((0, assets_1.getExAbilityPoolsSync)());
    // deduct the item
    (0, wdfpData_1.updatePlayerItemSync)(playerId, costItemId, afterCostItemAmount);
    // decide the status pool id
    const drawStatusId = exStatusPool[(0, crypto_1.randomInt)(exStatusPool.length)];
    // decide the ability ids
    const drawAbilityIdRange = tierAbilityIdCounts[drawTier];
    const tierAbilityRates = tierAbilityTierRates[drawTier];
    const drawAbilityIdCount = (0, crypto_1.randomInt)(drawAbilityIdRange[0], drawAbilityIdRange[1] + 1);
    const drawAbilityIdList = [];
    for (let i = 0; i < drawAbilityIdCount; i++) {
        const roll = (0, crypto_1.randomInt)(1, 101);
        let offset = 0;
        let tier = 1;
        for (const rate of tierAbilityRates) {
            if ((rate + offset) >= roll)
                break;
            tier += 1;
            offset += rate;
        }
        const pool = abilityPools[tier];
        const randomIndex = (0, crypto_1.randomInt)(pool.length);
        drawAbilityIdList.push(pool[randomIndex]);
        pool.splice(randomIndex, 1);
    }
    const drawResult = {
        characterId: characterId,
        statusId: drawStatusId,
        abilityIdList: drawAbilityIdList
    };
    const headers = (0, utils_1.generateDataHeaders)({
        viewer_id: viewerId
    });
    reply.header("content-type", "application/x-msgpack");
    if (autoAccept) {
        // update player character data
        (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, {
            exBoost: {
                statusId: drawResult.statusId,
                abilityIdList: drawResult.abilityIdList
            }
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": headers,
            "data": {
                "character_list": [
                    {
                        "character_id": characterId,
                        "viewer_id": viewerId,
                        "ex_boost": {
                            "status_id": drawResult.statusId,
                            "ability_id_list": drawResult.abilityIdList
                        },
                        "create_time": (0, utils_2.clientSerializeDate)(characterData.joinTime),
                        "update_time": (0, utils_2.clientSerializeDate)(characterData.updateTime),
                        "join_time": (0, utils_2.clientSerializeDate)(characterData.joinTime)
                    }
                ],
                "item_list": {
                    [String(costItemId)]: afterCostItemAmount
                },
                "mail_arrived": false
            }
        });
    }
    else {
        // add to player draws table
        playerDraws[playerId] = drawResult;
        return reply.status(200).send({
            "data_headers": headers,
            "data": {
                "character_id": characterId,
                "draw_result": {
                    "status_id": drawStatusId,
                    "ability_id_list": drawAbilityIdList
                },
                "item_list": {
                    [String(costItemId)]: afterCostItemAmount
                },
                "mail_arrived": false
            }
        });
    }
});
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/select", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const isConfirm = body.is_confirm;
        if (isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        // get viewer id session
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
        // get draw result
        const drawResult = playerDraws[playerId];
        if (drawResult === undefined)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "No draw result to select."
            });
        // generate response headers
        const headers = (0, utils_1.generateDataHeaders)({
            viewer_id: viewerId
        });
        // remove player draws entry
        delete playerDraws[playerId];
        // return if not confirmed
        if (!isConfirm) {
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": headers,
                "data": {
                    "mail_arrived": false
                }
            });
        }
        // get current character data
        const characterId = drawResult.characterId;
        const characterData = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        if (characterData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Player does not own character."
            });
        // update player character data
        (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, {
            exBoost: {
                statusId: drawResult.statusId,
                abilityIdList: drawResult.abilityIdList
            }
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": headers,
            "data": {
                "character_list": [
                    {
                        "character_id": characterId,
                        "viewer_id": viewerId,
                        "ex_boost": {
                            "status_id": drawResult.statusId,
                            "ability_id_list": drawResult.abilityIdList
                        },
                        "create_time": (0, utils_2.clientSerializeDate)(characterData.joinTime),
                        "update_time": (0, utils_2.clientSerializeDate)(characterData.updateTime),
                        "join_time": (0, utils_2.clientSerializeDate)(characterData.joinTime)
                    }
                ],
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/draw", (request, reply) => __awaiter(void 0, void 0, void 0, function* () { return drawExpBoost(request, reply, false); }));
    fastify.post("/first_draw", (request, reply) => __awaiter(void 0, void 0, void 0, function* () { return drawExpBoost(request, reply, true); }));
});
exports.default = routes;
