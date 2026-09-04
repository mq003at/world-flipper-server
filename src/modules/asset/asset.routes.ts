import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import { parseAssetClientContext, parseGetPathRequest } from "./asset.contracts";
import { presentPathList, presentVersionInfo } from "./asset.presenter";
import type { AssetService } from "./asset.service";

export function createAssetRoutes(service: AssetService, clock: Clock): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/version_info", async (request, reply) => {
            const context = parseAssetClientContext(request.headers);
            const result = service.getVersionInfo(context);

            reply.header("content-type", "application/x-msgpack");
            return presentVersionInfo(clock, result);
        });

        fastify.post("/get_path", async (request, reply) => {
            const input = parseGetPathRequest(request.body);
            const context = parseAssetClientContext(request.headers, {
                requireDeviceLanguage: true,
            });
            const result = service.getPath(context);

            reply.header("content-type", "application/x-msgpack");
            return presentPathList(clock, input.viewerId, result);
        });
    };
}
