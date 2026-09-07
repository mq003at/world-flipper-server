import type { FastifyPluginAsync } from "fastify";
import type { GachaProbabilityService } from "./gacha-probability.service";

export function createGachaProbabilityRoutes(service: GachaProbabilityService): FastifyPluginAsync {
    return async (fastify) => {
        fastify.get("/active", async (_request, reply) => {
            reply.header("cache-control", "no-store");
            return service.activeManifest();
        });
    };
}
