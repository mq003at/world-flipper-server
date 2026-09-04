import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "../../protocol/worldflipper/data-headers";
import {
    parseFinishQuestRequest,
    parseStartQuestRequest,
    parseViewerQuestRequest,
} from "./quest.contracts";
import { presentBattleFinish } from "./quest.presenter";
import type { QuestService } from "./quest.service";

export function createSingleBattleQuestRoutes(
    service: QuestService,
    clock: Clock,
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/start", async (request, reply) => {
            const input = parseStartQuestRequest(request.body);
            service.start(input);
            const headers = createDataHeaders(clock, { viewer_id: input.viewerId });

            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: headers,
                data: {
                    user_info: { last_main_quest_id: input.questId },
                    category_id: input.category,
                    is_multi: "single",
                    start_time: headers.servertime,
                    quest_name: "",
                },
            };
        });

        fastify.post("/finish", async (request, reply) => {
            const input = parseFinishQuestRequest(request.body);
            const result = service.finishBattle(input);
            const headers = createDataHeaders(clock, { viewer_id: input.viewerId });
            const data = presentBattleFinish(result);
            data.start_time = headers.servertime;

            reply.header("content-type", "application/x-msgpack");
            return { data_headers: headers, data };
        });

        fastify.post("/abort", async (request, reply) => {
            const input = parseViewerQuestRequest(request.body);
            service.abort(input);
            const headers = createDataHeaders(clock, { viewer_id: input.viewerId });

            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: headers,
                data: {
                    user_info: {},
                    category_id: input.category,
                    is_multi: "single",
                    start_time: headers.servertime,
                    quest_name: "",
                },
            };
        });

        fastify.post("/play_continue", async (request, reply) => {
            const input = parseViewerQuestRequest(request.body);
            const balances = service.continue(input);

            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: {
                    user_info: {
                        free_vmoney: balances.freeVmoney,
                        vmoney: balances.vmoney,
                    },
                    mail_arrived: false,
                },
            };
        });
    };
}
