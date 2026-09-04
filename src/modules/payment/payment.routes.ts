import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "../../protocol/worldflipper/data-headers";
import {
    parsePaymentItemListRequest,
    parsePaymentPurchaseRequest,
} from "./payment.contracts";
import { presentPaymentItemList, presentPaymentPurchase } from "./payment.presenter";
import type { PaymentService } from "./payment.service";

export function createPaymentRoutes(service: PaymentService, clock: Clock): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/item_list", async (request, reply) => {
            const input = parsePaymentItemListRequest(request.body);
            const packs = service.list(input.viewerId);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: presentPaymentItemList(packs),
            };
        });

        const purchaseHandler = async (request: FastifyRequest, reply: FastifyReply) => {
            const input = parsePaymentPurchaseRequest(request.body);
            const result = service.purchase(input);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: presentPaymentPurchase(result),
            };
        };

        // /purchase is the fan-server API. /buy and /complete are compatibility aliases
        // so a captured client callback can be wired without touching PaymentService.
        fastify.post("/purchase", purchaseHandler);
        fastify.post("/buy", purchaseHandler);
        fastify.post("/complete", purchaseHandler);
    };
}
