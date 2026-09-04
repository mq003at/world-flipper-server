import type { FastifyPluginAsync } from "fastify";
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

        fastify.post("/claim", async (request, reply) => {
            const input = parseMailClaim(request.body);
            const result = service.claim(input.viewerId, input.mailId);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: { ...presentMailClaim(result), mail_arrived: service.hasArrived(input.viewerId) },
            };
        });

        fastify.post("/claim_all", async (request, reply) => {
            const input = parseMailClaimAll(request.body);
            const result = service.claimAll(input.viewerId);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: { ...presentMailClaimAll(result), mail_arrived: service.hasArrived(input.viewerId) },
            };
        });
    };
}
