import type {
    FastifyInstance,
    FastifyPluginAsync,
    FastifyReply,
} from "fastify"
import type {
    AuthLoginDeviceBody,
    LoginAgreementBody,
    ZatLoginBody,
} from "./openapi.contracts"
import { OpenApiHttpError } from "./openapi.errors"
import {
    presentAgreement,
    presentCountry,
    presentDeviceAccessToken,
    presentDeviceLogin,
    presentZatLogin,
} from "./openapi.presenter"
import { OpenApiService } from "./openapi.service"

async function execute<T>(
    fastify: FastifyInstance,
    reply: FastifyReply,
    action: () => Promise<T>,
): Promise<void> {
    try {
        reply.code(200).send(await action())
    } catch (error) {
        if (error instanceof OpenApiHttpError) {
            reply.code(error.statusCode).send(error.toBody())
            return
        }

        fastify.log.error({ err: error }, "Unhandled OpenAPI error")
        reply.code(500).send({
            error: "Internal Server Error",
            message: "Unexpected OpenAPI failure.",
        })
    }
}

const routes: FastifyPluginAsync = async (fastify) => {
    const service = new OpenApiService()

    fastify.post("/v3/util/country/get", async (_, reply) => {
        reply.code(200).send(presentCountry())
    })

    fastify.post("/v4/device/accessToken/create", async (_, reply) => {
        reply.code(200).send(presentDeviceAccessToken())
    })

    fastify.post<{ Body: ZatLoginBody }>("/v3/zat/login", async (request, reply) => {
        await execute(fastify, reply, async () => {
            const result = await service.loginWithZat(request.body)
            return presentZatLogin(result.account, result.session, request.body.lang)
        })
    })

    fastify.post("/v3/push/token/register", async (_, reply) => {
        reply.code(200).send({})
    })

    fastify.post<{ Body: LoginAgreementBody }>(
        "/v3/agreement/getForLogin",
        async (request, reply) => {
            reply.code(200).send(presentAgreement(request.body))
        },
    )

    fastify.post("/v3/player/heartbeat", async (_, reply) => {
        reply.code(200).send({})
    })

    // Kakao ancillary endpoint. The original Starpoint route set does not
    // implement it, but the current client calls it during startup.
    fastify.post("/v3/promotion/checkUrlPromotion", async (_, reply) => {
        reply.code(200).send({})
    })

    fastify.post<{ Body: AuthLoginDeviceBody }>(
        "/v4/auth/loginDevice",
        async (request, reply) => {
            await execute(fastify, reply, async () => {
                const rawPlayerId = Array.isArray(request.headers.playerid)
                    ? request.headers.playerid[0]
                    : request.headers.playerid

                const result = await service.loginDevice(request.body, rawPlayerId)

                return presentDeviceLogin(
                    result.account,
                    result.idpAlias,
                    result.zatSession,
                    result.zrtSession,
                )
            })
        },
    )
}

export default routes
