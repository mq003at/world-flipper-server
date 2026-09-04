import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "../../protocol/worldflipper/data-headers";
import {
    parseFinishTutorialTriggerRequest,
    parseUpdateTutorialStepRequest,
} from "./tutorial.contracts";
import { presentTutorialUpdate } from "./tutorial.presenter";
import type { TutorialService } from "./tutorial.service";

export function createTutorialRoutes(
    service: TutorialService,
    clock: Clock,
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/finish_trigger", async (request, reply) => {
            const input = parseFinishTutorialTriggerRequest(request.body);
            service.finishTrigger(input);

            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: [],
            };
        });

        fastify.post("/update_step", async (request, reply) => {
            const input = parseUpdateTutorialStepRequest(request.body);
            const result = service.updateStep(input);

            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: presentTutorialUpdate(result),
            };
        });
    };
}
