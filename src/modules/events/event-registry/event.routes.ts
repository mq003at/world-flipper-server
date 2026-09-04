import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../../infrastructure/clock/clock";
import { createDataHeaders } from "../../../protocol/worldflipper/data-headers";
import { parseGetActiveEvents } from "./event.contracts";
import { presentActiveEvent } from "./event.presenter";
import type { EventService } from "./event.service";

/** Fan-server extension. Original simple/story event gameplay still uses quest/shop routes. */
export function createEventRoutes(service: EventService, clock: Clock): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/get_active", async (request, reply) => {
            const input = parseGetActiveEvents(request.body);
            const events = service.listActive(input.viewerId);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: { event_list: events.map(presentActiveEvent) },
            };
        });
    };
}
