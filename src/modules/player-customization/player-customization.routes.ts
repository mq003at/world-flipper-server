import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "../../protocol/worldflipper/data-headers";
import {
    parseEditParty,
    parseEditPartyGroups,
    parseUpdateOptions,
} from "./player-customization.contracts";
import type { PlayerCustomizationService } from "./player-customization.service";

export function createOptionRoutes(
    service: PlayerCustomizationService,
    clock: Clock,
): FastifyPluginAsync {
    return async (fastify) => {
        const update = async (request: FastifyRequest, reply: FastifyReply) => {
            const input = parseUpdateOptions(request.body);
            const options = service.updateOptions(input);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: { user_option: options, mail_arrived: false },
            };
        };

        fastify.post("/update", update);
        fastify.post("/update_in_battle", update);
    };
}

export function createPartyRoutes(
    service: PlayerCustomizationService,
    clock: Clock,
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/edit", async (request, reply) => {
            const input = parseEditParty(request.body);
            service.editParty(input);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: { mail_arrived: false },
            };
        });
    };
}

export function createPartyGroupRoutes(
    service: PlayerCustomizationService,
    clock: Clock,
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/edit", async (request, reply) => {
            const input = parseEditPartyGroups(request.body);
            service.editPartyGroups(input);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: [],
            };
        });
    };
}
