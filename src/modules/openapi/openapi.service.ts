import { generateIdpAlias } from "../../utils"
import type { AuthLoginDeviceBody, ZatLoginBody } from "./openapi.contracts"
import { DEFAULT_IDP_CODE, ZAT_TTL_MS, ZRT_TTL_MS } from "./openapi.constants"
import { OpenApiHttpError } from "./openapi.errors"
import {
    openApiRepository,
    type OpenApiAccount,
    type OpenApiSession,
} from "./openapi.repository"

interface ZatLoginResult {
    account: OpenApiAccount
    session: OpenApiSession
}

interface DeviceLoginResult {
    account: OpenApiAccount
    idpAlias: string
    zatSession: OpenApiSession
    zrtSession: OpenApiSession
}

function expiresIn(milliseconds: number): Date {
    return new Date(Date.now() + milliseconds)
}

function parsePlayerId(rawPlayerId: string | undefined): number | undefined {
    if (rawPlayerId === undefined || rawPlayerId.trim() === "") {
        return undefined
    }

    const playerId = Number.parseInt(rawPlayerId, 10)
    if (!Number.isFinite(playerId)) {
        throw OpenApiHttpError.badRequest("Invalid playerId provided.")
    }

    return playerId
}

async function createSession(accountId: number, type: typeof openApiRepository.sessionType.ZAT | typeof openApiRepository.sessionType.ZRT) {
    const ttl = type === openApiRepository.sessionType.ZAT ? ZAT_TTL_MS : ZRT_TTL_MS

    return openApiRepository.insertSession({
        expires: expiresIn(ttl),
        accountId,
        type,
    })
}

async function restoreZatSession(body: ZatLoginBody): Promise<OpenApiSession | null> {
    // This deliberately preserves the original algorithm. Note that loginDevice
    // generates an alias with serialNo while this fallback uses os. That mismatch
    // deserves a protocol-level investigation before we change behavior.
    const idpAlias = generateIdpAlias(body.appId, body.deviceId, body.os)
    const accountId = Number.parseInt(body.playerId, 10)

    if (!Number.isFinite(accountId)) {
        return null
    }

    const account = await openApiRepository.getAccount(accountId)
    if (!account || account.idpAlias !== idpAlias) {
        return null
    }

    await openApiRepository.deleteAccountSessionsOfType(
        account.id,
        openApiRepository.sessionType.ZAT,
    )

    return createSession(account.id, openApiRepository.sessionType.ZAT)
}

export class OpenApiService {
    async loginWithZat(body: ZatLoginBody): Promise<ZatLoginResult> {
        if (!body.zat) {
            throw OpenApiHttpError.badRequest("Invalid request body.")
        }

        let session = await openApiRepository.getSession(body.zat)
        if (session === null) {
            session = await restoreZatSession(body)
        }

        if (session === null || session.type !== openApiRepository.sessionType.ZAT) {
            throw OpenApiHttpError.badRequest("Invalid zat provided.")
        }

        let account: OpenApiAccount | null
        try {
            account = await openApiRepository.updateAccount({
                id: session.accountId,
                lastLoginTime: new Date(),
            })
        } catch (error) {
            throw OpenApiHttpError.internal("No account assigned to session.")
        }

        if (!account) {
            throw OpenApiHttpError.internal("No account assigned to session.")
        }

        // Rotate the ZAT after successful authentication.
        await openApiRepository.deleteSession(session.token)
        const newSession = await createSession(
            account.id,
            openApiRepository.sessionType.ZAT,
        )

        return {
            account,
            session: newSession,
        }
    }

    async loginDevice(
        body: AuthLoginDeviceBody,
        rawPlayerId: string | undefined,
    ): Promise<DeviceLoginResult> {
        const { appId, deviceId, serialNo } = body
        if (!appId || !deviceId || !serialNo) {
            throw OpenApiHttpError.badRequest("Invalid request body.")
        }

        const accountId = parsePlayerId(rawPlayerId)
        const idpAlias = generateIdpAlias(appId, deviceId, serialNo)
        const idpId = body.whiteKey

        const existingAccount = accountId === undefined
            ? openApiRepository.getAccountFromIdpId(idpId)
            : await openApiRepository.getAccount(accountId)

        const account = existingAccount === null
            ? await openApiRepository.insertAccount({
                appId,
                idpAlias,
                idpCode: DEFAULT_IDP_CODE,
                idpId,
                status: "normal",
            })
            : existingAccount

        if (account === null || account.idpId !== idpId) {
            throw OpenApiHttpError.badRequest("Invalid playerId provided.")
        }

        if (accountId !== undefined) {
            await openApiRepository.deleteAccountSessionsOfType(
                account.id,
                openApiRepository.sessionType.ZAT,
            )
            await openApiRepository.deleteAccountSessionsOfType(
                account.id,
                openApiRepository.sessionType.ZRT,
            )
        }

        if (existingAccount === null || existingAccount.idpAlias !== idpAlias) {
            await openApiRepository.updateAccount({
                id: account.id,
                idpAlias,
            })
        }

        const zatSession = await createSession(
            account.id,
            openApiRepository.sessionType.ZAT,
        )
        const zrtSession = await createSession(
            account.id,
            openApiRepository.sessionType.ZRT,
        )

        return {
            account,
            idpAlias,
            zatSession,
            zrtSession,
        }
    }
}
