import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "./data-headers";

interface ReproducePostBody {
    viewer_id?: number | null;
}

function viewerIdFromBody(body: unknown): number | undefined {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return undefined;
    }

    const viewerId = (body as ReproducePostBody).viewer_id;
    return typeof viewerId === "number" && Number.isFinite(viewerId)
        ? viewerId
        : undefined;
}

/**
 * Compatibility endpoint used by the client to upload reproduce/device logs.
 * Legacy Starpoint accepted the payload without persisting it and returned an
 * empty data array, so the clean server intentionally treats this as a no-op.
 */
export function createReproduceRoutes(clock: Clock): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/post", async (request, reply) => {
            const viewerId = viewerIdFromBody(request.body);

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
