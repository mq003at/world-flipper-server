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
const wdfpData_1 = require("../../data/wdfpData");
const assets_1 = require("../../lib/assets");
const quest_1 = require("../../lib/quest");
const utils_1 = require("../../utils");
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/finish", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        const questSection = body.category;
        const questId = body.quest_id;
        // get quest data & check if it is the right type
        const questData = (0, assets_1.getQuestFromCategorySync)(questSection, questId);
        if (questData === null || ("sPlusReward" in questData))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid quest ID provided."
            });
        // get quest progress
        const questProgress = (0, wdfpData_1.getPlayerSingleQuestProgressSync)(playerId, questSection, questId);
        const finished = questProgress !== null ? questProgress.finished : false;
        const rewardResult = !finished && questData.clearReward !== undefined ? (0, quest_1.givePlayerRewardSync)(playerId, questData.clearReward) : null;
        if (!finished) {
            // update quest progress
            if (questProgress === null) {
                // insert if it doesn't already exist.
                (0, wdfpData_1.insertPlayerQuestProgressSync)(playerId, questSection, {
                    questId: questId,
                    finished: true
                });
            }
            else {
                // simply update the quest progress if it already exists.
                (0, wdfpData_1.updatePlayerQuestProgressSync)(playerId, questSection, {
                    questId: questId,
                    finished: true
                });
            }
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": !finished ? {
                "user_info": {
                    "free_vmoney": playerData.freeVmoney + ((rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.user_info.free_vmoney) || 0),
                    "free_mana": playerData.freeMana + ((rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.user_info.free_mana) || 0)
                },
                "character_list": (rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.character_list) || [],
                "joined_character_id_list": (rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.joined_character_id_list) || [],
                "equipment_list": (rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.equipment_list) || [],
                "items": (rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.items) || {}
            } : [],
        });
    }));
});
exports.default = routes;
