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
exports.characterMaxOverLimits = void 0;
const wdfpData_1 = require("../../data/wdfpData");
const utils_1 = require("../../utils");
const assets_1 = require("../../lib/assets");
const utils_2 = require("../../data/utils");
exports.characterMaxOverLimits = {
    [1]: 12, // 1* max over limit count
    [2]: 10, // 2* max over limit count
    [3]: 8, // 3* max over limit count 
    [4]: 6, // 4* max over limit count
    [5]: 4, // 5* max over limit count 
};
const openManaBoardRequiredUncaps = {
    [1]: 10,
    [2]: 8,
    [3]: 6,
    [4]: 4,
    [5]: 2
};
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/set_illustration_settings", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const characterId = body.character_id;
        const illustration_settings = body.illustration_settings;
        if (isNaN(viewerId) || isNaN(characterId) || !illustration_settings)
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
        // get player id
        const playerIds = yield (0, wdfpData_1.getAccountPlayers)(viewerIdSession.accountId);
        const playerId = playerIds[0];
        if (playerId === undefined)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No players bound to account."
            });
        // update character
        (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, {
            illustrationSettings: illustration_settings.slice(0, 6)
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {}
        });
    }));
    fastify.post("/receive_bond_token", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const body = request.body;
        const viewerId = body.viewer_id;
        const characterId = body.character_id;
        const manaBoardIndex = body.mana_board_index;
        if (isNaN(viewerId) || isNaN(characterId) || isNaN(manaBoardIndex))
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
        // get character data
        const characterData = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        if (characterData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Character not owned."
            });
        const bondTokenReceivable = ((_a = characterData.bondTokenList[manaBoardIndex - 1]) === null || _a === void 0 ? void 0 : _a.status) === 1;
        if (!bondTokenReceivable)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Cannot receive bond token."
            });
        // reward the bond token
        const newBondTokens = player.bondToken + 1;
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            bondToken: newBondTokens
        });
        // update bond token status
        (0, wdfpData_1.updatePlayerCharacterBondTokenSync)(playerId, characterId, {
            manaBoardIndex: manaBoardIndex,
            status: 2
        });
        // build bond token list for response
        let bondTokenList = [];
        for (const entry of characterData.bondTokenList) {
            const entryIndex = entry.manaBoardIndex;
            bondTokenList.push({
                "mana_board_index": entryIndex,
                "status": entryIndex === manaBoardIndex ? 2 : entry.status
            });
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "user_info": {
                    "bond_token": newBondTokens
                },
                "character_list": [
                    {
                        "character_id": characterId,
                        "bond_token_list": bondTokenList,
                        "create_time": (0, utils_2.clientSerializeDate)(characterData.joinTime),
                        "update_time": (0, utils_2.clientSerializeDate)(characterData.updateTime),
                        "join_time": (0, utils_2.clientSerializeDate)(characterData.joinTime)
                    }
                ],
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/open_mana_board", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _b;
        const body = request.body;
        const viewerId = body.viewer_id;
        const characterId = body.character_id;
        const manaBoardIndex = body.mana_board_index;
        if (isNaN(viewerId) || isNaN(characterId) || isNaN(manaBoardIndex))
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
        const playerIds = yield (0, wdfpData_1.getAccountPlayers)(viewerIdSession.accountId);
        const playerId = playerIds[0];
        if (isNaN(playerId))
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No players bound to account."
            });
        // get character data
        const characterData = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        if (characterData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Character not owned."
            });
        // get character asset data
        const characterAssetData = (0, assets_1.getCharacterDataSync)(characterId);
        if (characterAssetData === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No character asset data found."
            });
        // make sure that the mana board index is valid
        if (!characterData.bondTokenList[manaBoardIndex - 1])
            return reply.status(400).send({
                "error": "Bad Request",
                "message": `Character does not have mana board with index ${manaBoardIndex}.`
            });
        // ensure that the mana board can be opened
        // TODO: Add level check.  5*: Level 80, 4*: Level 70, 3*: Level 60.
        if (openManaBoardRequiredUncaps[characterAssetData.rarity] > characterData.overLimitStep)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": `Character is not uncapped enough to unlock mana board.`
            });
        if (1 > ((_b = characterData.bondTokenList[manaBoardIndex - 2]) === null || _b === void 0 ? void 0 : _b.status))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": `Must unlock all previous mana board nodes.`
            });
        (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, {
            manaBoardIndex: manaBoardIndex
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "character_list": [
                    {
                        "viewer_id": viewerId,
                        "character_id": characterId,
                        "mana_board_index": manaBoardIndex,
                        "create_time": (0, utils_2.clientSerializeDate)(characterData.joinTime),
                        "update_time": (0, utils_2.clientSerializeDate)(characterData.updateTime),
                        "join_time": (0, utils_2.clientSerializeDate)(characterData.joinTime)
                    }
                ],
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/learn_mana_node", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _c;
        const body = request.body;
        const viewerId = body.viewer_id;
        const characterId = body.character_id;
        const toUnlockNodeIds = body.mana_node_multiplied_id_list;
        if (!viewerId || isNaN(viewerId) || !characterId || isNaN(characterId) || !toUnlockNodeIds)
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
        // get character data
        const characterData = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        if (characterData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Character not owned."
            });
        // compute the combined cost of each node
        let manaCost = 0;
        const itemsCosts = {};
        const userCharacterManaNodeListItem = [];
        // get mana node data from assets
        const currentManaNodeIndex = characterData.manaBoardIndex;
        const characterManaNodes = (0, assets_1.getCharacterManaNodesSync)(characterId, currentManaNodeIndex);
        if (characterManaNodes === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": `Character does not have mana nodes of index '${currentManaNodeIndex}'.`
            });
        // get currently unlocked nodes
        const unlockedManaNodes = (0, wdfpData_1.getPlayerCharacterManaNodesSync)(playerId, characterId);
        const unlockedManaNodesRecord = {};
        let indexUnlockedNodesCount = 0; // the number of nodes that have been unlocked for the selected index
        for (const manaNodeId of unlockedManaNodes) {
            unlockedManaNodesRecord[manaNodeId] = true;
            indexUnlockedNodesCount += characterManaNodes[manaNodeId] === undefined ? 0 : 1;
        }
        for (const manaNodeId of toUnlockNodeIds) {
            if (unlockedManaNodesRecord[manaNodeId])
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Mana node '${manaNodeId}' already unlocked.`
                });
            const nodeData = characterManaNodes[manaNodeId];
            if (nodeData === undefined)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Mana node '${manaNodeId}' does not exist.`
                });
            if (nodeData !== null) {
                manaCost += nodeData.manaCost;
                for (const [itemId, itemCost] of Object.entries(nodeData.items)) {
                    const existing = itemsCosts[itemId];
                    itemsCosts[itemId] = existing ? existing + itemCost : itemCost;
                }
                userCharacterManaNodeListItem.push({
                    "mana_node_multiplied_id": manaNodeId
                });
            }
        }
        // validate that the player has enough materials to unlock these nodes
        // TODO: Allow the usage of paidMana
        const newMana = player.freeMana - manaCost;
        if (0 > newMana)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Not enough mana."
            });
        for (const [itemId, itemCost] of Object.entries(itemsCosts)) {
            const item = (0, wdfpData_1.getPlayerItemSync)(playerId, itemId);
            const newAmount = item === null ? -1 : item - itemCost;
            if (0 > newAmount)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Not enough of item with id ${itemId}`
                });
            // replace the object value with the newAmount for deduction later
            itemsCosts[itemId] = newAmount;
        }
        // deduct mana
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            freeMana: newMana
        });
        // deduct item amounts
        for (const [itemId, newAmount] of Object.entries(itemsCosts)) {
            (0, wdfpData_1.updatePlayerItemSync)(playerId, itemId, newAmount);
        }
        // increase evolution level
        let characterEvolutionLevel = characterData.evolutionLevel;
        let evolutionData = [];
        if (characterEvolutionLevel === 0) {
            characterEvolutionLevel = 1;
            (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, {
                evolutionLevel: characterEvolutionLevel
            });
            evolutionData = {
                "character_id": characterId,
                "level": 1,
                "img_level": 1
            };
        }
        // give bond reward, if available
        const amityScrollReceivable = ((_c = characterData.bondTokenList[currentManaNodeIndex - 1]) === null || _c === void 0 ? void 0 : _c.status) === 0;
        const bondTokenList = [];
        if (amityScrollReceivable && (indexUnlockedNodesCount + toUnlockNodeIds.length) === Object.keys(characterManaNodes).length) {
            (0, wdfpData_1.updatePlayerCharacterBondTokenSync)(playerId, characterId, {
                manaBoardIndex: currentManaNodeIndex,
                status: 1
            });
            for (const entry of characterData.bondTokenList) {
                const entryIndex = entry.manaBoardIndex;
                bondTokenList.push({
                    "mana_board_index": entryIndex,
                    "status": entryIndex === currentManaNodeIndex ? 1 : entry.status
                });
            }
        }
        // insert new mana nodes
        (0, wdfpData_1.insertPlayerCharacterManaNodesSync)(playerId, characterId, toUnlockNodeIds);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "user_info": {
                    "free_mana": newMana
                },
                "character_list": [
                    {
                        "evolution_level": characterEvolutionLevel,
                        "evolution_img_level": characterEvolutionLevel,
                        "character_id": characterId,
                        "create_time": (0, utils_2.clientSerializeDate)(characterData.joinTime),
                        "update_time": (0, utils_2.clientSerializeDate)(characterData.updateTime),
                        "join_time": (0, utils_2.clientSerializeDate)(characterData.joinTime),
                        "bond_token_list": bondTokenList
                    }
                ],
                "evolution": evolutionData,
                "item_list": itemsCosts,
                "user_character_mana_node_list": {
                    [String(characterId)]: userCharacterManaNodeListItem
                },
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/over_limit", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        // get character data
        const characterId = body.character_id;
        const playerCharacterData = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        if (playerCharacterData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Character not owned."
            });
        // get character asset data
        const characterAssetData = (0, assets_1.getCharacterDataSync)(characterId);
        if (characterAssetData === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No character asset data found."
            });
        // calculate new over limit
        const overLimitCount = body.over_limit_count;
        const newOverLimit = playerCharacterData.overLimitStep + overLimitCount;
        const characterRarity = characterAssetData.rarity;
        if (newOverLimit > exports.characterMaxOverLimits[characterRarity])
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Character cannot be uncapped further."
            });
        let stack = playerCharacterData.stack;
        const item_list = {};
        if (body.use_stack) {
            // stack uncapping
            // ensure that the character has enough stack
            stack = stack - overLimitCount;
            if (0 > stack)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Character does not have enough duplicates to uncap."
                });
            // update the character
            (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, {
                overLimitStep: newOverLimit,
                stack: stack
            });
        }
        else {
            // item uncapping
            const itemId = body.item_id;
            // ensure that the item trying to be used is valid
            // 5* characters can only be uncapped by item 10003 (awaking_crystal_5)
            // 4* characters and below can only be uncapped by items 10002 (awaking_crystal_4) and 10001 (awaking_crystal_3)
            if ((characterRarity === 5 && itemId !== 10003)
                || (4 >= characterRarity && (itemId !== 10002 && itemId !== 10001)))
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Attempted to use invalid item."
                });
            const itemData = (0, wdfpData_1.getPlayerItemSync)(playerId, itemId);
            if (itemData === null)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Attempted to use unowned item."
                });
            // make sure that the player has enough of the item
            const newAmount = itemData - overLimitCount;
            if (0 > newAmount)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Not enough of item to uncap."
                });
            // update the item count
            (0, wdfpData_1.updatePlayerItemSync)(playerId, itemId, newAmount);
            item_list[itemId] = newAmount; // add to items table
            // update the character
            (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, {
                overLimitStep: newOverLimit
            });
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "character_list": [
                    {
                        "over_limit_step": newOverLimit,
                        "character_id": characterId,
                        "stack": stack,
                        "create_time": (0, utils_2.clientSerializeDate)(playerCharacterData.joinTime),
                        "update_time": (0, utils_2.clientSerializeDate)(new Date()),
                        "join_time": (0, utils_2.clientSerializeDate)(playerCharacterData.joinTime)
                    }
                ],
                "item_list": item_list,
                "mail_arrived": false
            }
        });
    }));
});
exports.default = routes;
