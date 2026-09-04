import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "../../protocol/worldflipper/data-headers";
import { parseBuyShopItemRequest, parseGetSalesListRequest } from "./shop.contracts";
import { presentSalesList, presentShopBuy } from "./shop.presenter";
import type { ShopService } from "./shop.service";

export function createShopRoutes(service: ShopService, clock: Clock): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/buy", async (request, reply) => {
            const input = parseBuyShopItemRequest(request.body);
            const result = service.buy(input);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: presentShopBuy(result),
            };
        });

        fastify.post("/get_sales_list", async (request, reply) => {
            const input = parseGetSalesListRequest(request.body);
            const sales = service.getSalesList(input);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: presentSalesList(sales),
            };
        });
    };
}
