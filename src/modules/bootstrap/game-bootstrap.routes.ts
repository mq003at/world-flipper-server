import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "../../protocol/worldflipper/data-headers";
import { InvalidRequestError } from "../../shared/errors/application-error";
import { presentPlayerSnapshot } from "../player/player.presenter";
import {
    parseGameLoadRequest,
    parseGetHeaderResponseRequest,
    parseToolSignupRequest,
} from "./game-bootstrap.contracts";
import type { GameBootstrapService } from "./game-bootstrap.service";

function requiredHeader(request: FastifyRequest, key: string): string {
    const raw = request.headers[key];
    if (raw === undefined) throw new InvalidRequestError("Invalid headers.");
    return Array.isArray(raw) ? raw[0] : String(raw);
}

export function createGameBootstrapRoutes(
    service: GameBootstrapService,
    clock: Clock,
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/tool/get_header_response", async (request, reply) => {
            const input = parseGetHeaderResponseRequest(request.body);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: [],
            };
        });

        fastify.post("/tool/signup", async (request, reply) => {
            const input = parseToolSignupRequest(request.body);
            const udid = requiredHeader(request, "udid");
            const result = service.signup(input.accessToken);

            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(
                    clock,
                    {
                        viewer_id: result.viewerId,
                        udid,
                    },
                    ["short_udid", "viewer_id", "udid", "servertime", "result_code"],
                ),
                data: [],
            };
        });

        fastify.post("/load", async (request, reply) => {
            const input = parseGameLoadRequest(request.body);
            const result = service.load(input.accessToken, input.viewerId);

            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, {
                    asset_update: true,
                    viewer_id: result.viewerId,
                }),
                data: presentPlayerSnapshot(result.snapshot, {
                    viewerId: result.viewerId,
                    availableAssetVersion: result.availableAssetVersion,
                }),
            };
        });
    };
}
