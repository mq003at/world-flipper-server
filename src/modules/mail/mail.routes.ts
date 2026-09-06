import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "../../protocol/worldflipper/data-headers";
import { parseMailClaim, parseMailClaimAll, parseMailIndex } from "./mail.contracts";
import { presentMail, presentMailClaim, presentMailClaimAll } from "./mail.presenter";
import type { MailService } from "./mail.service";

export function createMailRoutes(service: MailService, clock: Clock): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/index", async (request, reply) => {
            const input = parseMailIndex(request.body);
            const result = service.index(input.viewerId, input.currentPage);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: {
                    mail: result.mail.map(presentMail),
                    total_count: result.totalCount,
                },
            };
        });

        const receive = async (request: FastifyRequest, reply: FastifyReply) => {
            const input = parseMailClaim(request.body);
            const result = service.claim(input.viewerId, input.mailId);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: { ...presentMailClaim(result), mail_arrived: service.hasArrived(input.viewerId) },
            };
        };

        const receiveAll = async (request: FastifyRequest, reply: FastifyReply) => {
            const input = parseMailClaimAll(request.body);
            const result = service.claimAll(input.viewerId);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: { ...presentMailClaimAll(result), mail_arrived: service.hasArrived(input.viewerId) },
            };
        };

        // The live client uses receive/receive_all. Keep claim/claim_all as
        // internal aliases for compatibility with the new API naming.
        fastify.post("/receive", receive);
        fastify.post("/claim", receive);
        fastify.post("/receive_all", receiveAll);
        fastify.post("/claim_all", receiveAll);
    };
}
