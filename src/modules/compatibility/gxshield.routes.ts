import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "../../protocol/worldflipper/data-headers";

function optionalViewerId(body: unknown): number | undefined {
    if (typeof body !== "object" || body === null || Array.isArray(body)) return undefined;
    const value = (body as Record<string, unknown>).viewer_id;
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0
        ? value
        : undefined;
}

/**
 * The retired GXShield service received client-side risk telemetry. Starpoint is
 * a trusted private server, so reports are acknowledged but never persisted and
 * never mutate or ban an account.
 */
export function createGxShieldRoutes(clock: Clock): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/scanrisk", async (request, reply) => {
            const viewerId = optionalViewerId(request.body);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(
                    clock,
                    viewerId === undefined ? {} : { viewer_id: viewerId },
                ),
                data: [],
            };
        });
    };
}
