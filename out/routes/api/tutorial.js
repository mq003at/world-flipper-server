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
const utils_1 = require("../../data/utils");
const wdfpData_1 = require("../../data/wdfpData");
const utils_2 = require("../../utils");
const assets_1 = require("../../lib/assets");
const gacha_1 = require("../../lib/gacha");
const crypto_1 = require("crypto");
const freeTutorialCharacterId = 243001;
const tutorialGachaCharacterIds = [251001, 251002, 251003, 251004, 251005, 251006, 251007, 251008];
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/finish_trigger", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const tutorialIds = body.tutorial_ids;
        if (!viewerId || isNaN(viewerId) || !tutorialIds || !(tutorialIds instanceof Array))
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
        // mark tutorial as having been completed
        for (const tutorialId of tutorialIds) {
            // TODO: add checking for if the tutorial is already triggered.
            (0, wdfpData_1.insertPlayerTriggeredTutorialSync)(playerId, tutorialId);
        }
        reply.header("content-type", "application/x-msgpack");
        reply.status(200).send({
            "data_headers": (0, utils_2.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": []
        });
    }));
    fastify.post("/update_step", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        const completedStep = body.step;
        const skip = body.skip || false;
        if (!viewerId || isNaN(completedStep) || isNaN(viewerId))
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
                "message": "No player bound to account."
            });
        // check if tutorial is already completed
        const completedTutorial = (0, wdfpData_1.getPlayerTriggeredTutorialsSync)(playerId);
        if (completedTutorial.find((value) => value === 12))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Tutorial already completed"
            });
        // update player
        const currentStep = player.tutorialStep;
        let nextStep = completedStep + 1;
        if ((currentStep || 0) > nextStep)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Attempt to redo previous tutorial step."
            });
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            tutorialStep: nextStep,
            tutorialSkipFlag: skip,
            name: body.name
        });
        // offset nextStep by 11 if skipped, to keep steps the same.
        nextStep += (body.skip ? 11 : 0);
        reply.header("content-type", "application/x-msgpack");
        const headers = (0, utils_2.generateDataHeaders)({
            viewer_id: viewerId
        });
        if (nextStep === 15 && body.gacha_id !== undefined && !isNaN(body.gacha_id)) {
            const gachaId = body.gacha_id;
            const gachaData = (0, assets_1.getGachaSync)(gachaId);
            if (gachaData === null)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Gacha with id '${body.gacha_id}' does not exist.`
                });
            // perform pull
            const drawResult = new Map();
            const randomCharacterIndex = (0, crypto_1.randomInt)(0, tutorialGachaCharacterIds.length);
            const randomCharacterId = tutorialGachaCharacterIds[randomCharacterIndex];
            drawResult.set(randomCharacterId, 1);
            // reward pull
            const rewardResult = (0, gacha_1.rewardPlayerGachaDrawResultSync)(playerId, gachaData, drawResult);
            const newFreeVmoney = player.freeVmoney - gachaData.singleCost;
            (0, wdfpData_1.updatePlayerSync)({
                id: playerId,
                freeVmoney: newFreeVmoney
            });
            const draw = rewardResult.draw[0];
            draw.movie_id = "normal_guarantee";
            draw.seed = 10007656;
            return reply.status(200).send({
                "data_headers": headers,
                "data": {
                    "step": nextStep,
                    "user_info": {
                        "free_vmoney": newFreeVmoney,
                    },
                    "gacha": {
                        "draw": rewardResult.draw,
                        "gacha_info_list": [
                            {
                                "gacha_id": gachaId,
                                "is_account_first": false,
                                "is_daily_first": false,
                            }
                        ],
                    },
                    "character_list": rewardResult.characters,
                    "item_list": rewardResult.items,
                    "encyclopedia_info": [],
                    "mail_arrived": false,
                    "start_time": (0, utils_2.getServerTime)()
                }
            });
        }
        else if (nextStep === 16) {
            // give 1500 vmoney
            const newVMoney = player.freeVmoney + 1500;
            (0, wdfpData_1.updatePlayerSync)({
                id: playerId,
                freeVmoney: newVMoney
            });
            // give free character
            const serializedDate = (0, utils_1.clientSerializeDate)(new Date());
            (0, wdfpData_1.insertDefaultPlayerCharacterSync)(playerId, freeTutorialCharacterId);
            reply.status(200).send({
                "data_headers": headers,
                "data": {
                    "step": nextStep,
                    "user_info": {
                        "free_vmoney": newVMoney
                    },
                    "character_list": [
                        {
                            "viewer_id": viewerId,
                            "character_id": freeTutorialCharacterId,
                            "entry_count": 1,
                            "exp": 0,
                            "exp_total": 0,
                            "bond_token_list": [
                                {
                                    "mana_board_index": 1,
                                    "status": 0
                                },
                                {
                                    "mana_board_index": 2,
                                    "status": 0
                                }
                            ],
                            "mana_board_index": 1,
                            "create_time": serializedDate,
                            "update_time": serializedDate,
                            "join_time": serializedDate
                        }
                    ],
                    "encyclopedia_info": {
                        [`1${freeTutorialCharacterId}01`]: {
                            "read": false
                        }
                    },
                    "mail_arrived": true,
                    "start_time": (0, utils_2.getServerTime)()
                }
            });
        }
        else {
            reply.status(200).send({
                "data_headers": headers,
                "data": {
                    "step": nextStep,
                    "mail_arrived": true,
                    "start_time": (0, utils_2.getServerTime)()
                }
            });
        }
    }));
});
exports.default = routes;
