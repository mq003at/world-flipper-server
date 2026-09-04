import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "../../protocol/worldflipper/data-headers";
import { parseStoryFinishRequest } from "./quest.contracts";
import { presentStoryFinish } from "./quest.presenter";
import type { QuestService } from "./quest.service";

export function createStoryQuestRoutes(
    service: QuestService,
    clock: Clock,
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/finish", async (request, reply) => {
            const input = parseStoryFinishRequest(request.body);
            const result = service.finishStory(input);

            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: presentStoryFinish(result),
            };
        });
    };
}
