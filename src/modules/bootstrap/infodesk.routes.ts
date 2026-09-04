import type { FastifyPluginAsync } from "fastify";
import {
    INFODESK_APP_GROUP_RESPONSE,
    INFODESK_APP_GROUP_SIG,
    INFODESK_APP_RESPONSE,
    INFODESK_APP_SIG,
} from "../../protocol/kakao/infodesk.responses";

export const infodeskRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get("/v2/appGroup", async (_request, reply) => {
        reply.header("sig", INFODESK_APP_GROUP_SIG);
        return INFODESK_APP_GROUP_RESPONSE;
    });

    fastify.get("/v2/app", async (_request, reply) => {
        reply.header("sig", INFODESK_APP_SIG);
        return INFODESK_APP_RESPONSE;
    });
};
