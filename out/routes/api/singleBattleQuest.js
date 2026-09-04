"use strict";
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
exports.insertActiveQuest = void 0;
const wdfpData_1 = require("../../data/wdfpData");
const assets_1 = require("../../lib/assets");
const character_1 = require("../../lib/character");
const quest_1 = require("../../lib/quest");
const types_1 = require("../../lib/types");
const utils_1 = require("../../utils");
const rushEvent_1 = require("./rushEvent");
const types_2 = require("../../data/types");
const rush_1 = require("../../lib/rush");
const continueVmoneyCost = 50;
const activeQuests = {};
function insertActiveQuest(playerId, quest) {
    activeQuests[playerId] = quest;
}
exports.insertActiveQuest = insertActiveQuest;
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/finish", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
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
        const playerData = !isNaN(playerId) ? (0, wdfpData_1.getPlayerSync)(playerId) : null;
        if (playerData === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No player bound to account."
            });
        // get active quest data
        const activeQuestData = activeQuests[playerId];
        if (activeQuestData === undefined)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "No active quest to finish."
            });
        // get quest data
        const questCategory = activeQuestData.category;
        const questId = activeQuestData.questId;
        const questData = (0, assets_1.getQuestFromCategorySync)(questCategory, questId);
        if (questData === null || !('rankPointReward' in questData))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Quest doesn't exist."
            });
        // delete the active quest data from global record
        delete activeQuests[playerId];
        // calculate clear rank
        const clearTime = body.elapsed_time_ms;
        const clearRank = questData.sPlusRankTime >= clearTime ? 5
            : questData.sRankTime >= clearTime ? 4
                : questData.aRankTime >= clearTime ? 3
                    : questData.bRankTime >= clearTime ? 2
                        : 1;
        // calculate player rewards
        const newExpPool = playerData.expPool + questData.poolExpReward;
        const beforeRankPoint = playerData.rankPoint;
        const newRankPoint = beforeRankPoint + questData.rankPointReward;
        let newMana = playerData.freeMana + questData.manaReward + body.add_mana;
        // calculate boost point
        let newBoostPoint = playerData.boostPoint - (activeQuestData.useBoostPoint ? 1 : 0);
        let newBossBoostPoint = playerData.bossBoostPoint - (activeQuestData.useBossBoostPoint ? 1 : 0);
        let useBoostPoint = (activeQuestData.useBoostPoint && (newBoostPoint >= 0)) || (activeQuestData.useBossBoostPoint && (newBossBoostPoint >= 0));
        // check current quest progress
        const questProgress = (0, wdfpData_1.getPlayerSingleQuestProgressSync)(playerId, questCategory, questId);
        const questPreviouslyCompleted = questProgress !== null;
        const questAccomplished = body.is_accomplished;
        const clearReward = !questPreviouslyCompleted && questData.clearReward !== undefined ? (0, quest_1.givePlayerRewardSync)(playerId, questData.clearReward) : null;
        const sPlusClearReward = (clearRank === 5) && ((questProgress === null || questProgress === void 0 ? void 0 : questProgress.clearRank) !== 5) && (questData.sPlusReward !== undefined) ? (0, quest_1.givePlayerRewardSync)(playerId, questData.sPlusReward) : null;
        if (questAccomplished) {
            // update quest progress
            if (questPreviouslyCompleted) {
                // simply update the quest progress if it already exists.
                (0, wdfpData_1.updatePlayerQuestProgressSync)(playerId, questCategory, {
                    questId: questId,
                    finished: true,
                    bestElapsedTimeMs: questProgress.bestElapsedTimeMs === undefined || questProgress.bestElapsedTimeMs === null ? clearTime : Math.min(clearTime, questProgress.bestElapsedTimeMs),
                    clearRank: questProgress.clearRank === undefined ? clearRank : Math.max(clearRank, questProgress.clearRank),
                    highScore: questProgress.highScore === undefined ? body.score : Math.max(body.score, questProgress.highScore)
                });
            }
            else {
                // insert if it doesn't already exist.
                (0, wdfpData_1.insertPlayerQuestProgressSync)(playerId, questCategory, {
                    questId: questId,
                    finished: true,
                    bestElapsedTimeMs: clearTime,
                    clearRank: clearRank,
                    highScore: body.score
                });
            }
        }
        // update player
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            freeMana: newMana,
            expPool: newExpPool,
            rankPoint: newRankPoint,
            boostPoint: newBoostPoint,
            bossBoostPoint: newBossBoostPoint
        });
        // reward score rewards
        const scoreRewardsResult = (0, quest_1.givePlayerScoreRewardsSync)(playerId, questData.scoreRewardGroupId, questData.scoreRewardGroup, useBoostPoint);
        // reward character exp
        const bodyPartyStatistics = body.statistics.party;
        const partyCharacterIds = [...bodyPartyStatistics.characters, ...bodyPartyStatistics.unison_characters];
        const partyCharacterIdsArray = [];
        for (const value of partyCharacterIds.values()) {
            if (value !== null && value.id !== null)
                partyCharacterIdsArray.push(value.id);
        }
        const addExpAmount = questData.characterExpReward;
        const rewardCharacterExpResult = (0, character_1.givePlayerCharactersExpSync)(playerId, partyCharacterIdsArray, addExpAmount, questData.fixedParty !== undefined);
        const dataHeaders = (0, utils_1.generateDataHeaders)({
            viewer_id: viewerId
        });
        // handle event quest-specific data & rewards
        let rushEventData = null;
        let rushEventRewardsResult = null;
        if (questCategory === types_1.QuestCategory.RUSH_EVENT) {
            // rush event
            const rushEventId = questData.rushEventId;
            const rushEventFolderId = questData.rushEventFolderId;
            const rushEventRound = questData.rushEventRound;
            if (rushEventFolderId !== undefined && rushEventRound !== undefined && rushEventId !== undefined) {
                // update rush event data
                const rushEventBattleType = rushEventRound === 0 ? types_2.RushEventBattleType.ENDLESS : types_2.RushEventBattleType.FOLDER;
                // map character ids
                const characterIds = bodyPartyStatistics.characters.map(val => { var _a; return (_a = val === null || val === void 0 ? void 0 : val.id) !== null && _a !== void 0 ? _a : null; });
                const unisonCharacterIds = bodyPartyStatistics.unison_characters.map(val => { var _a; return (_a = val === null || val === void 0 ? void 0 : val.id) !== null && _a !== void 0 ? _a : null; });
                // get evolution image levels
                const evolutionImgLevels = (0, character_1.getCharactersEvolutionImgLevels)(playerId, characterIds);
                const unisonEvolutionImgLevels = (0, character_1.getCharactersEvolutionImgLevels)(playerId, unisonCharacterIds);
                let round = questId;
                // update endless battle stats
                if (rushEventBattleType === types_2.RushEventBattleType.ENDLESS) {
                    // get player rush event data
                    const playerRushEventData = (0, wdfpData_1.getPlayerRushEventSync)(playerId, rushEventId);
                    const playerNextRound = (_a = playerRushEventData === null || playerRushEventData === void 0 ? void 0 : playerRushEventData.endlessBattleNextRound) !== null && _a !== void 0 ? _a : 1;
                    const playerMaxRound = (_b = playerRushEventData === null || playerRushEventData === void 0 ? void 0 : playerRushEventData.endlessBattleMaxRound) !== null && _b !== void 0 ? _b : 1;
                    const playerBestClearTime = (_c = playerRushEventData === null || playerRushEventData === void 0 ? void 0 : playerRushEventData.endlessBattleMaxRoundTime) !== null && _c !== void 0 ? _c : Number.MAX_SAFE_INTEGER;
                    round = playerNextRound;
                    if ((playerNextRound >= playerMaxRound && playerBestClearTime >= clearTime) || (playerNextRound > playerMaxRound)) {
                        (0, wdfpData_1.updatePlayerRushEventSync)(playerId, {
                            eventId: rushEventId,
                            endlessBattleMaxRound: playerNextRound,
                            endlessBattleMaxRoundTime: clearTime,
                            endlessBattleMaxRoundCharacterIds: characterIds,
                            endlessBattleMaxRoundCharacterEvolutionImgLvls: evolutionImgLevels
                        });
                    }
                }
                else if (rushEventBattleType === types_2.RushEventBattleType.FOLDER && (rushEventRound >= ((_d = rushEvent_1.rushEventFolderMaxRounds[rushEventFolderId]) !== null && _d !== void 0 ? _d : 0))) {
                    // mark folder as complete since this is the final round
                    (0, wdfpData_1.insertPlayerRushEventClearedFolderSync)(playerId, rushEventId, rushEventFolderId);
                    // update the active folder value
                    (0, wdfpData_1.updatePlayerRushEventSync)(playerId, {
                        eventId: rushEventId,
                        activeRushBattleFolderId: null
                    });
                    // delete played parties
                    (0, wdfpData_1.deletePlayerRushEventPlayedPartyListSync)(playerId, rushEventId, rushEventBattleType);
                }
                // insert played party
                (0, wdfpData_1.insertPlayerRushEventPlayedPartySync)(playerId, rushEventId, {
                    characterIds: characterIds,
                    unisonCharacterIds: unisonCharacterIds,
                    equipmentIds: bodyPartyStatistics.equipments.map(val => { var _a; return (_a = val === null || val === void 0 ? void 0 : val.id) !== null && _a !== void 0 ? _a : null; }),
                    abilitySoulIds: bodyPartyStatistics.ability_soul_ids,
                    evolutionImgLevels: evolutionImgLevels,
                    unisonEvolutionImgLevels: unisonEvolutionImgLevels,
                    battleType: rushEventBattleType,
                    round: round
                });
                // get serialized parties
                const serializedPlayedParties = (0, rush_1.getSerializedPlayerRushEventPlayedPartiesSync)(playerId, rushEventId);
                // set rush event data
                rushEventData = {
                    "rush_battle_reward_list": [],
                    "rush_battle_played_party_list": serializedPlayedParties.folderParties,
                    "endless_battle_played_party_list": serializedPlayedParties.endlessParties,
                    "is_out_of_period": false
                };
                // give rewards if allowed
                if (rushEventRound >= ((_e = rushEvent_1.rushEventFolderMaxRounds[rushEventFolderId]) !== null && _e !== void 0 ? _e : 0)) {
                    const rewards = (_f = (0, assets_1.getRushEventFolderClearRewards)(rushEventId, rushEventFolderId)) !== null && _f !== void 0 ? _f : [];
                    rushEventRewardsResult = (0, quest_1.givePlayerRewardsSync)(playerId, rewards);
                    rushEventData.rush_battle_reward_list = rewards.map(reward => {
                        const itemReward = reward;
                        return {
                            "kind": 1,
                            "kind_id": itemReward.id,
                            "number": itemReward.count
                        };
                    });
                }
            }
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": dataHeaders,
            "data": {
                "user_info": {
                    "free_mana": newMana + ((clearReward === null || clearReward === void 0 ? void 0 : clearReward.user_info.free_mana) || 0) + ((sPlusClearReward === null || sPlusClearReward === void 0 ? void 0 : sPlusClearReward.user_info.free_mana) || 0) + scoreRewardsResult.user_info.free_mana,
                    "exp_pool": rewardCharacterExpResult.exp_pool + ((clearReward === null || clearReward === void 0 ? void 0 : clearReward.user_info.exp_pool) || 0) + scoreRewardsResult.user_info.exp_pool,
                    "exp_pooled_time": (0, utils_1.getServerTime)(playerData.expPooledTime),
                    "free_vmoney": playerData.freeVmoney + ((clearReward === null || clearReward === void 0 ? void 0 : clearReward.user_info.free_vmoney) || 0) + ((sPlusClearReward === null || sPlusClearReward === void 0 ? void 0 : sPlusClearReward.user_info.free_vmoney) || 0) + scoreRewardsResult.user_info.free_vmoney,
                    "rank_point": newRankPoint,
                    "stamina": playerData.stamina,
                    "stamina_heal_time": (0, utils_1.getServerTime)(playerData.staminaHealTime),
                    "boost_point": newBoostPoint,
                    "boss_boost_point": newBossBoostPoint
                },
                "add_exp_list": rewardCharacterExpResult.add_exp_list,
                "character_list": [
                    ...rewardCharacterExpResult.character_list,
                    ...((clearReward === null || clearReward === void 0 ? void 0 : clearReward.character_list) || []),
                    ...((sPlusClearReward === null || sPlusClearReward === void 0 ? void 0 : sPlusClearReward.character_list) || []),
                    ...scoreRewardsResult.character_list
                ],
                "bond_token_status_list": rewardCharacterExpResult.bond_token_status_list,
                "rewards": {
                    "overflow_pool_exp": 0,
                    "converted_pool_exp": 0,
                    "reward_pool_exp": questData.poolExpReward,
                    "reward_mana": questData.manaReward,
                    "field_mana": body.add_mana
                },
                "old_high_score": questProgress === null ? 0 : questProgress.highScore || 0,
                "joined_character_id_list": [
                    ...((clearReward === null || clearReward === void 0 ? void 0 : clearReward.joined_character_id_list) || []),
                    ...((sPlusClearReward === null || sPlusClearReward === void 0 ? void 0 : sPlusClearReward.joined_character_id_list) || []),
                    ...scoreRewardsResult.joined_character_id_list
                ],
                "before_rank_point": beforeRankPoint,
                "clear_rank": clearRank,
                "drop_score_reward_ids": scoreRewardsResult.drop_score_reward_ids,
                "drop_rare_reward_ids": scoreRewardsResult.drop_rare_reward_ids,
                "drop_additional_reward_ids": [],
                "drop_periodic_reward_ids": [],
                "equipment_list": scoreRewardsResult.equipment_list,
                "category_id": questCategory,
                "start_time": dataHeaders['servertime'],
                "is_multi": "single",
                "quest_name": "",
                "item_list": Object.assign(Object.assign({}, scoreRewardsResult.items), ((_g = rushEventRewardsResult === null || rushEventRewardsResult === void 0 ? void 0 : rushEventRewardsResult.items) !== null && _g !== void 0 ? _g : {})),
                "rush_event": rushEventData
            }
        });
    }));
    fastify.post("/abort", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (isNaN(viewerId))
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
                "message": "No player bound to account."
            });
        const headers = (0, utils_1.generateDataHeaders)({ viewer_id: body.viewer_id });
        // delete existing active quest
        delete activeQuests[playerId];
        return reply.status(200).send({
            "data_headers": headers,
            "data": {
                "user_info": {},
                "category_id": body.category,
                "is_multi": "single",
                "start_time": headers['servertime'],
                "quest_name": ""
            }
        });
    }));
    fastify.post("/start", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const partyId = body.party_id;
        const questId = body.quest_id;
        const category = body.category;
        const useBoostPoint = body.use_boost_point;
        const useBossBoostPoint = body.use_boss_boost_point;
        const isAutoStartMode = body.is_auto_start_mode;
        if (isNaN(viewerId) || isNaN(partyId) || isNaN(questId) || isNaN(category) || useBoostPoint === undefined || useBossBoostPoint === undefined || isAutoStartMode === undefined)
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
                "message": "No player bound to account."
            });
        // get quest data
        const questData = (0, assets_1.getQuestFromCategorySync)(category, questId);
        if (questData === null || !('rankPointReward' in questData))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Quest doesn't exist."
            });
        // add to active quests table
        delete activeQuests[playerId];
        activeQuests[playerId] = {
            questId: questId,
            category: category,
            useBoostPoint: useBoostPoint,
            useBossBoostPoint: useBossBoostPoint,
            isAutoStartMode: isAutoStartMode
        };
        // update player last quest id
        if (questData.fixedParty === undefined) {
            (0, wdfpData_1.updatePlayerSync)({
                id: playerId,
                partySlot: partyId
            });
        }
        const dataHeaders = (0, utils_1.generateDataHeaders)({
            viewer_id: viewerId
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": dataHeaders,
            "data": {
                "user_info": {
                    "last_main_quest_id": body.quest_id
                },
                "category_id": body.category,
                "is_multi": "single",
                "start_time": dataHeaders['servertime'],
                "quest_name": ""
            }
        });
    }));
    fastify.post("/play_continue", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (isNaN(viewerId))
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
        const player = isNaN(playerId) ? null : (0, wdfpData_1.getPlayerSync)(playerId);
        if (player === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No player bound to account."
            });
        // get active quest data
        const activeQuestData = activeQuests[playerId];
        if (activeQuestData === undefined)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "No active quest to continue."
            });
        const freeVmoney = player.freeVmoney;
        const newFreeVmoney = freeVmoney - continueVmoneyCost;
        const vmoney = player.vmoney;
        const newVmoney = 0 > newFreeVmoney ? vmoney - continueVmoneyCost : vmoney;
        if (0 > newFreeVmoney && 0 > newVmoney)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Not enough vmoney to continue"
            });
        // update the player's vmoney balances
        const setNewFreeVmoney = 0 > newFreeVmoney ? freeVmoney : newFreeVmoney;
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            freeVmoney: setNewFreeVmoney,
            vmoney: newVmoney
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "user_info": {
                    "free_vmoney": setNewFreeVmoney,
                    "vmoney": newVmoney
                },
                "mail_arrived": false
            }
        });
    }));
});
exports.default = routes;
