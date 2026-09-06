import type { FastifyPluginAsync } from "fastify";
import encyclopedia from "../../../assets/encyclopedia.json";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "../../protocol/worldflipper/data-headers";
import { InvalidRequestError } from "../../shared/errors/application-error";
import type { IdentityService } from "../identity/identity.service";

function asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new InvalidRequestError();
    }
    return value as Record<string, unknown>;
}

function parseViewerId(body: Record<string, unknown>): number {
    const viewerId = body.viewer_id;
    if (typeof viewerId !== "number" || !Number.isSafeInteger(viewerId) || viewerId <= 0) {
        throw new InvalidRequestError();
    }
    return viewerId;
}

export function createEncyclopediaRoutes(
    identity: IdentityService,
    clock: Clock,
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/index", async (request, reply) => {
            const viewerId = parseViewerId(asRecord(request.body));
            identity.requireViewerSession(viewerId);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: viewerId }),
                data: { encyclopedia_list: encyclopedia, mail_arrived: false },
            };
        });

        fastify.post("/read_keyword", async (request, reply) => {
            const body = asRecord(request.body);
            const viewerId = parseViewerId(body);
            if (!Array.isArray(body.encyclopedia_ids)) throw new InvalidRequestError();
            const entries: Record<string, { read: boolean }> = {};
            for (const value of body.encyclopedia_ids) {
                if (typeof value !== "number" || !Number.isSafeInteger(value)) {
                    throw new InvalidRequestError();
                }
                entries[String(value)] = { read: true };
            }
            identity.requireViewerSession(viewerId);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: viewerId }),
                data: { encyclopedia_list: entries },
            };
        });
    };
}
