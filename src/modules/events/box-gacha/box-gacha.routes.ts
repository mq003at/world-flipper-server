import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../../infrastructure/clock/clock";
import { createDataHeaders } from "../../../protocol/worldflipper/data-headers";
import { parseCloseBox, parseExecBoxGacha, parseGetBoxList } from "./box-gacha.contracts";
import { presentBoxExec, presentBoxInfo } from "./box-gacha.presenter";
import type { BoxGachaService } from "./box-gacha.service";

export function createBoxGachaRoutes(service: BoxGachaService, clock: Clock): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/get_box_list", async (request, reply) => {
            const input = parseGetBoxList(request.body);
            const result = service.getBoxList(input);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: { all_box_info: result.allBoxInfo.map(presentBoxInfo) },
            };
        });

        fastify.post("/exec", async (request, reply) => {
            const input = parseExecBoxGacha(request.body);
            const result = service.exec(input);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: presentBoxExec(result),
            };
        });

        fastify.post("/close", async (request, reply) => {
            const input = parseCloseBox(request.body);
            const result = service.close(input);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: { all_box_info: result.allBoxInfo.map(presentBoxInfo) },
            };
        });
    };
}
