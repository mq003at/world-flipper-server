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
const utils_1 = require("../../utils");
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/publish", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        if (isNaN(playerId))
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No players bound to account."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "party_code": "https://www.howLongCanThisBe?=+-.comhttps://www.howLongCanThisBe?=+-.comhttps://www.howLongCanThisBe?=+-.com"
            }
        });
    }));
    fastify.post("/edit", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        // update main party id if required
        if (player.partySlot !== body.main_party_id) {
            (0, wdfpData_1.updatePlayerSync)({
                id: playerId,
                partySlot: body.main_party_id
            });
        }
        // update each slot
        const characterOwnedMap = {};
        const equipmentOwnedMap = {};
        const mapOwnedCharacters = (characterId) => {
            let isOwned = characterId === null ? false : characterOwnedMap[characterId];
            if (isOwned === undefined) {
                isOwned = (0, wdfpData_1.playerOwnsCharacterSync)(playerId, characterId);
                characterOwnedMap[characterId] = isOwned;
            }
            return isOwned ? characterId : null;
        };
        const mapOwnedEquipment = (equipmentId) => {
            let isOwned = equipmentId === null ? false : equipmentOwnedMap[equipmentId];
            if (isOwned === undefined) {
                isOwned = (0, wdfpData_1.playerOwnsEquipmentSync)(playerId, equipmentId);
                equipmentOwnedMap[equipmentId] = isOwned;
            }
            return isOwned ? equipmentId : null;
        };
        for (const updateInfo of body.party_info_list) {
            (0, wdfpData_1.updatePlayerPartySync)(playerId, updateInfo.party_id, {
                name: updateInfo.party_name,
                unisonCharacterIds: updateInfo.unison_character_ids.map(mapOwnedCharacters),
                characterIds: updateInfo.character_ids.map(mapOwnedCharacters),
                equipmentIds: updateInfo.equipment_ids.map(mapOwnedEquipment), // TODO: Implement stack checking, to see if more equipment is being equipped than is owned.
                abilitySoulIds: updateInfo.ability_soul_ids,
                options: { allowOtherPlayersToHealMe: updateInfo.options.allow_other_players_to_heal_me },
                edited: updateInfo.party_edited,
                category: updateInfo.party_category
            });
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "mail_arrived": false
            }
        });
    }));
});
exports.default = routes;
