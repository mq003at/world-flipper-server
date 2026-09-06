import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import {
    parseAuthLoginDeviceRequest,
    parseLoginAgreementRequest,
    parseZatLoginRequest,
} from "../../protocol/kakao/openapi.contracts";
import { InvalidRequestError } from "../../shared/errors/application-error";
import {
    presentAgreement,
    presentLoginDevice,
    presentZatLogin,
} from "./identity.presenter";
import type { IdentityService } from "./identity.service";

function parsePlayerIdHeader(request: FastifyRequest): number | undefined {
    const raw = request.headers.playerid;
    if (raw === undefined) return undefined;

    const first = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number.parseInt(first, 10);
    if (Number.isNaN(parsed)) throw new InvalidRequestError("Invalid playerId provided.");
    return parsed;
}

interface StartingPopupsRequest {
    appId?: string | number;
    playerId?: string | number;
}

function presentStartingPopups(body: unknown): {
    promotions: never[];
    appId: string;
    playerId: string;
} {
    const request = (body ?? {}) as StartingPopupsRequest;

    return {
        promotions: [],
        appId: request.appId === undefined ? "" : String(request.appId),
        playerId: request.playerId === undefined ? "" : String(request.playerId),
    };
}

export function createIdentityRoutes(
    service: IdentityService,
    clock: Clock,
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/v3/util/country/get", async () => ({ country: "en" }));

        fastify.post("/v4/device/accessToken/create", async () =>
            service.createDeviceAccessToken(),
        );

        fastify.post("/v3/zat/login", async (request) => {
            const input = parseZatLoginRequest(request.body);
            return presentZatLogin(service.loginWithZat(input), input);
        });

        fastify.post("/v3/push/token/register", async () => ({}));

        fastify.post("/v3/agreement/getForLogin", async (request) => {
            const input = parseLoginAgreementRequest(request.body);
            return presentAgreement(input, clock);
        });

        fastify.post("/v3/player/heartbeat", async () => ({}));

        // Kakao SDK compatibility endpoints captured from the Global client.
        fastify.post("/v3/log/writeSdkBasicLog", async () => ({
            logId: randomUUID(),
        }));

        fastify.post("/v3/log/writeRoundLog", async () => ({
            logId: randomUUID(),
        }));

        fastify.post("/v3/promotion/checkUrlPromotion", async () => ({
            result: "NO_PROMOTION",
        }));

        fastify.post("/v3/promotion/getStartingPopups", async (request) =>
            presentStartingPopups(request.body),
        );

        fastify.post("/v3/promotion/popup/getList", async () => ({
            popups: [],
        }));

        fastify.post("/v4/auth/loginDevice", async (request) => {
            const input = parseAuthLoginDeviceRequest(request.body);
            const result = service.loginDevice({
                request: input,
                requestedAccountId: parsePlayerIdHeader(request),
            });
            return presentLoginDevice(result);
        });
    };
}
