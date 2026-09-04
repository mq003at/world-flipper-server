"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const openapi_errors_1 = require("./openapi.errors");
const openapi_presenter_1 = require("./openapi.presenter");
const openapi_service_1 = require("./openapi.service");
function execute(fastify, reply, action) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            reply.code(200).send(yield action());
        }
        catch (error) {
            if (error instanceof openapi_errors_1.OpenApiHttpError) {
                reply.code(error.statusCode).send(error.toBody());
                return;
            }
            fastify.log.error({ err: error }, "Unhandled OpenAPI error");
            reply.code(500).send({
                error: "Internal Server Error",
                message: "Unexpected OpenAPI failure.",
            });
        }
    });
}
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    const service = new openapi_service_1.OpenApiService();
    fastify.post("/v3/util/country/get", (_, reply) => __awaiter(void 0, void 0, void 0, function* () {
        reply.code(200).send((0, openapi_presenter_1.presentCountry)());
    }));
    fastify.post("/v4/device/accessToken/create", (_, reply) => __awaiter(void 0, void 0, void 0, function* () {
        reply.code(200).send((0, openapi_presenter_1.presentDeviceAccessToken)());
    }));
    fastify.post("/v3/zat/login", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        yield execute(fastify, reply, () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield service.loginWithZat(request.body);
            return (0, openapi_presenter_1.presentZatLogin)(result.account, result.session, request.body.lang);
        }));
    }));
    fastify.post("/v3/push/token/register", (_, reply) => __awaiter(void 0, void 0, void 0, function* () {
        reply.code(200).send({});
    }));
    fastify.post("/v3/agreement/getForLogin", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        reply.code(200).send((0, openapi_presenter_1.presentAgreement)(request.body));
    }));
    fastify.post("/v3/player/heartbeat", (_, reply) => __awaiter(void 0, void 0, void 0, function* () {
        reply.code(200).send({});
    }));
    // Kakao ancillary endpoint. The original Starpoint route set does not
    // implement it, but the current client calls it during startup.
    fastify.post("/v3/promotion/checkUrlPromotion", (_, reply) => __awaiter(void 0, void 0, void 0, function* () {
        reply.code(200).send({});
    }));
    fastify.post("/v4/auth/loginDevice", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        yield execute(fastify, reply, () => __awaiter(void 0, void 0, void 0, function* () {
            const rawPlayerId = Array.isArray(request.headers.playerid)
                ? request.headers.playerid[0]
                : request.headers.playerid;
            const result = yield service.loginDevice(request.body, rawPlayerId);
            return (0, openapi_presenter_1.presentDeviceLogin)(result.account, result.idpAlias, result.zatSession, result.zrtSession);
        }));
    }));
});
exports.default = routes;
