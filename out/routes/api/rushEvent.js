"use strict";
// Handles mail.
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
exports.rushEventFolderMaxRounds = void 0;
const types_1 = require("../../data/types");
const wdfpData_1 = require("../../data/wdfpData");
const assets_1 = require("../../lib/assets");
const types_2 = require("../../lib/types");
const utils_1 = require("../../utils");
const singleBattleQuest_1 = require("./singleBattleQuest");
const rush_1 = require("../../lib/rush");
const utils_2 = require("../../data/utils");
var ResetQuestType;
(function (ResetQuestType) {
    ResetQuestType[ResetQuestType["EMPTY"] = 0] = "EMPTY";
    ResetQuestType[ResetQuestType["FOLDER"] = 1] = "FOLDER";
    ResetQuestType[ResetQuestType["ENDLESS"] = 2] = "ENDLESS";
})(ResetQuestType || (ResetQuestType = {}));
exports.rushEventFolderMaxRounds = {
    [types_2.RushEventFolder.INTERMEDIATE]: 2,
    [types_2.RushEventFolder.ADVANCED]: 2,
    [types_2.RushEventFolder.GODLY]: 2
};
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/summary", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        if (isNaN(viewerId) || isNaN(eventId))
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
        // get rush event data
        let rushEventData = (0, wdfpData_1.getPlayerRushEventSync)(playerId, eventId);
        if (rushEventData === null) {
            rushEventData = (0, wdfpData_1.getDefaultPlayerRushEventSync)(eventId);
            (0, wdfpData_1.insertPlayerRushEventSync)(playerId, rushEventData);
        }
        // get cleared folder id list
        const clearedFolderIdList = (0, wdfpData_1.getPlayerRushEventClearedFoldersSync)(playerId, eventId);
        // get serialized parties
        const serializedPlayedParties = (0, rush_1.getSerializedPlayerRushEventPlayedPartiesSync)(playerId, eventId);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "endless_battle_next_round": rushEventData.endlessBattleNextRound,
                "active_rush_battle_folder_id": rushEventData.activeRushBattleFolderId,
                "endless_battle_played_max_round": rushEventData.endlessBattleNextRound,
                "cleared_folder_id_list": clearedFolderIdList,
                "endless_battle_played_party_list": serializedPlayedParties.endlessParties,
                "rush_battle_played_party_list": serializedPlayedParties.folderParties,
                "endless_battle_my_ranking": (0, rush_1.getPlayerRushEventEndlessBattleRankingSync)(playerId, eventId, {
                    rushEventData: rushEventData
                }),
                "aggregated_time": (0, utils_2.clientSerializeDate)((0, utils_1.getServerDate)()),
            }
        });
    }));
    fastify.post("/select_folder", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        const folderId = body.folder_id;
        if (isNaN(viewerId) || isNaN(eventId) || isNaN(folderId))
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
        // get existing rush event data 
        const rushEventData = (0, wdfpData_1.getPlayerRushEventSync)(playerId, eventId);
        if (rushEventData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": `No rush event data for rush event with id '${eventId}'`
            });
        // Error if a folder has already been selected
        if (rushEventData.activeRushBattleFolderId !== null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Already selected a folder for this rush event."
            });
        // update folder
        (0, wdfpData_1.updatePlayerRushEventSync)(playerId, {
            eventId: eventId,
            activeRushBattleFolderId: folderId
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "folder_id": folderId,
                "event_id": eventId
            }
        });
    }));
    fastify.post("/ranking", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        const page = (_a = body.page) !== null && _a !== void 0 ? _a : 0;
        if (isNaN(viewerId) || isNaN(eventId))
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
        // get player endless rank
        const endlessRanking = (0, rush_1.getPlayerRushEventEndlessBattleRankingSync)(playerId, eventId);
        // get all rankings for page
        const rankings = (0, wdfpData_1.getRushEventEndlessRankingListSync)(eventId, page);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "aggregated_time": (0, utils_2.clientSerializeDate)((0, utils_1.getServerDate)()),
                "current_page": page + 1,
                "page_max": rankings.pageMax,
                "my_data": endlessRanking,
                "ranking_list": rankings.list
            }
        });
    }));
    fastify.post("/ranking/played_party", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _b;
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        const rankNumber = body.rank_number;
        if (isNaN(viewerId) || isNaN(eventId) || isNaN(rankNumber))
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
        if (isNaN(playerIds[0]))
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No player bound to account."
            });
        // get party list
        const partyList = (_b = (0, rush_1.getRushEventEndlessBattleRankPlayedPartyListSync)(rankNumber, eventId)) !== null && _b !== void 0 ? _b : [];
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "rush_ranking_party": partyList
            }
        });
    }));
    fastify.post("/aggregated_time", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        if (isNaN(viewerId) || isNaN(eventId))
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
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "aggregated_time": (0, utils_2.clientSerializeDate)((0, utils_1.getServerDate)())
            }
        });
    }));
    fastify.post("/party", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        // get parties
        let playerPartyGroups = (0, wdfpData_1.getPlayerPartyGroupListSync)(playerId, types_1.PartyCategory.EVENT);
        // insert default parties if no parties already exist
        if (0 >= Object.keys(playerPartyGroups).length) {
            playerPartyGroups = (0, wdfpData_1.getPlayerPartyGroupListSync)(playerId, types_1.PartyCategory.NORMAL);
            // convert party categories
            for (const group of Object.values(playerPartyGroups)) {
                for (const party of Object.values(group.list)) {
                    party.category = types_1.PartyCategory.EVENT;
                }
                group.category = types_1.PartyCategory.EVENT;
            }
            (0, wdfpData_1.insertPlayerPartyGroupListSync)(playerId, playerPartyGroups);
        }
        // convert to proper format
        const userPartyGroupList = [];
        for (const [idString, group] of Object.entries(playerPartyGroups)) {
            const partyList = [];
            // convert parties
            for (const [partyIdString, party] of Object.entries(group.list)) {
                partyList.push({
                    ability_soul_ids: party.abilitySoulIds,
                    character_ids: party.characterIds,
                    equipment_ids: party.equipmentIds,
                    unison_character_ids: party.unisonCharacterIds,
                    options: {
                        allow_other_players_to_heal_me: party.options.allowOtherPlayersToHealMe
                    },
                    party_edited: party.edited,
                    party_id: Number(partyIdString),
                    party_name: party.name
                });
            }
            userPartyGroupList.push({
                "party_group_color_id": group.colorId,
                "party_group_id": Number(idString),
                "party_list": partyList
            });
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "user_party_group_list": userPartyGroupList
            }
        });
    }));
    fastify.post("/battle/start", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const isAutoStartMode = body.is_auto_start_mode;
        const partyId = body.party_id;
        const questId = body.quest_id;
        if (isNaN(viewerId) || isNaN(partyId) || isNaN(questId) || isAutoStartMode === undefined)
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
        // get quest
        const questData = (0, assets_1.getQuestFromCategorySync)(types_2.QuestCategory.RUSH_EVENT, questId);
        if (questData === null || !('rankPointReward' in questData) || questData.rushEventId === undefined)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Quest doesn't exist."
            });
        // insert active quest for '/single_battle_quest/finish' endpoint
        (0, singleBattleQuest_1.insertActiveQuest)(playerId, {
            questId: questId,
            category: types_2.QuestCategory.RUSH_EVENT,
            useBoostPoint: false,
            useBossBoostPoint: false,
            isAutoStartMode: isAutoStartMode
        });
        const headers = (0, utils_1.generateDataHeaders)({
            viewer_id: viewerId
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": headers,
            "data": {
                "user_info": {
                    "last_main_quest_id": body.quest_id
                },
                "is_multi": "single",
                "start_time": headers['servertime'],
                "quest_name": ""
            }
        });
    }));
    fastify.post("/reset", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const eventId = body.event_id;
        const questType = body.quest_type;
        const resetTargetId = body.reset_target_id;
        const isResetAfterTargetRound = body.is_reset_after_target_round;
        if (isNaN(viewerId) || isNaN(eventId) || isNaN(questType))
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
        if (questType === ResetQuestType.FOLDER) {
            // if reset target was provided, we're not resetting the entire folder
            if (resetTargetId !== undefined) {
                (0, wdfpData_1.deletePlayerRushEventPlayedPartiesUntilSync)(playerId, eventId, types_1.RushEventBattleType.FOLDER, resetTargetId);
            }
            else {
                // reset entire folder
                // update the active folder value
                (0, wdfpData_1.updatePlayerRushEventSync)(playerId, {
                    eventId: eventId,
                    activeRushBattleFolderId: null
                });
                // delete played parties
                (0, wdfpData_1.deletePlayerRushEventPlayedPartyListSync)(playerId, eventId, types_1.RushEventBattleType.FOLDER);
            }
        }
        else if (resetTargetId !== undefined) {
            // endless battle resetting
            if (isResetAfterTargetRound) {
                // "reset up until here"
                (0, wdfpData_1.deletePlayerRushEventPlayedPartiesUntilSync)(playerId, eventId, types_1.RushEventBattleType.ENDLESS, resetTargetId);
            }
            else {
                // "reset only here"
                (0, wdfpData_1.deletePlayerRushEventPlayedPartySync)(playerId, eventId, resetTargetId, types_1.RushEventBattleType.ENDLESS);
            }
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": []
        });
    }));
});
exports.default = routes;
