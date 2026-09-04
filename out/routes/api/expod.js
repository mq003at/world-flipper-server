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
const wdfpData_1 = require("../../data/wdfpData");
const character_1 = require("../../lib/character");
const utils_1 = require("../../utils");
const assets_1 = require("../../lib/assets");
const utils_2 = require("../../data/utils");
const rarityStackConvertItemCount = {
    [1]: 2,
    [2]: 2,
    [3]: 2,
    [4]: 10,
    [5]: 30
};
const rewardItemId = 990008;
const rarityStackConvertExp = {
    [1]: 500,
    [2]: 500,
    [3]: 500,
    [4]: 2000,
    [5]: 10000
};
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/stack_to_exp", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const characterId = body.character_id;
        const convertCount = body.number;
        if (isNaN(viewerId) || isNaN(characterId) || isNaN(convertCount))
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
        const player = !isNaN(playerId) ? (0, wdfpData_1.getPlayerSync)(playerId) : null;
        if (player === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No players bound to account."
            });
        // get character asset data
        const characterAssetData = (0, assets_1.getCharacterDataSync)(characterId);
        if (characterAssetData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Character does not exist."
            });
        // get character
        const character = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        if (character === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Player does not own character."
            });
        const afterStack = character.stack - convertCount;
        if (0 > afterStack)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Not enough stack."
            });
        // get amounts to add
        const rarity = characterAssetData.rarity;
        const increaseExp = rarityStackConvertExp[rarity] * convertCount;
        const increaseItemCount = rarityStackConvertItemCount[rarity] * convertCount;
        const afterExp = player.expPool + increaseExp;
        // update player
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            expPool: afterExp
        });
        // add item
        const afterItemCount = (0, wdfpData_1.givePlayerItemSync)(playerId, rewardItemId, increaseItemCount);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "user_info": {
                    "exp_pool": afterExp,
                    "exp_pooled_time": (0, utils_1.getServerTime)(player.expPooledTime)
                },
                "character_list": [
                    {
                        "viewer_id": viewerId,
                        "character_id": characterId,
                        "stack": afterStack,
                        "exp": character.exp,
                        "exp_total": character.exp,
                        "create_time": (0, utils_2.clientSerializeDate)(character.joinTime),
                        "update_time": (0, utils_2.clientSerializeDate)(character.updateTime),
                        "join_time": (0, utils_2.clientSerializeDate)(character.joinTime)
                    }
                ],
                "converted_exp_info": {
                    "add_exp": increaseExp
                },
                "item_list": {
                    [rewardItemId]: afterItemCount
                },
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/inject_exp", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
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
        const player = !isNaN(playerId) ? (0, wdfpData_1.getPlayerSync)(playerId) : null;
        if (player === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No players bound to account."
            });
        // increase character exp
        const characterId = body.character_id;
        const character = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        if (character === null)
            return reply.status(400).send({
                "error": "Internal Server Error",
                "message": "Player does not own character."
            });
        // make sure that the player has enough exp
        const addExp = Math.abs(body.exp);
        const playerExpPool = player.expPool;
        if (addExp > playerExpPool)
            return reply.status(400).send({
                "error": "Internal Server Error",
                "message": "Not enough exp."
            });
        const playerAfterExpPool = player.expPool - addExp;
        // decrease player exp
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            expPool: playerAfterExpPool
        });
        // add exp to the character
        const rewardResult = (0, character_1.givePlayerCharactersExpSync)(playerId, [characterId], addExp, false);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "add_exp_list": rewardResult.add_exp_list,
                "character_list": rewardResult.character_list,
                "user_info": {
                    "exp_pool": rewardResult.exp_pool,
                    "exp_pooled_time": (0, utils_1.getServerTime)(player.expPooledTime)
                },
            }
        });
    }));
});
exports.default = routes;
