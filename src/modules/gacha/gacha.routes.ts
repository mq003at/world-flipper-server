import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "../../protocol/worldflipper/data-headers";
import {
    parseExchangeCharacterRequest,
    parseExchangeEquipmentRequest,
    parseExecuteGachaRequest,
} from "./gacha.contracts";
import {
    presentExchangeCharacter,
    presentExchangeEquipment,
    presentExecuteGacha,
} from "./gacha.presenter";
import type { GachaService } from "./gacha.service";

export function createGachaRoutes(service: GachaService, clock: Clock): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/exec", async (request, reply) => {
            const input = parseExecuteGachaRequest(request.body);
            const result = service.execute(input);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: presentExecuteGacha(result),
            };
        });

        fastify.post("/exchange_character", async (request, reply) => {
            const input = parseExchangeCharacterRequest(request.body);
            const result = service.exchangeCharacter(input);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: presentExchangeCharacter(result),
            };
        });

        fastify.post("/exchange_equipment", async (request, reply) => {
            const input = parseExchangeEquipmentRequest(request.body);
            const result = service.exchangeEquipment(input);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: presentExchangeEquipment(result),
            };
        });
    };
}
