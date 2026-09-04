import type { LoginAgreementBody } from "./openapi.contracts"
import type { OpenApiAccount, OpenApiSession } from "./openapi.repository"
import {
    AGREEMENT,
    DEVICE_ACCESS_TOKEN,
    DEVICE_ACCESS_TOKEN_TTL_MS,
} from "./openapi.constants"

const pushOption = {
    night: "n",
    player: "n",
} as const

function agreementState(timestamp: string) {
    return {
        E001: "y",
        E002: "y",
        E006: "y",
        N002: "n",
        N003: "n",
        timestamp,
    }
}

export function presentCountry() {
    return { country: "en" }
}

export function presentDeviceAccessToken(now = Date.now()) {
    return {
        accessToken: DEVICE_ACCESS_TOKEN,
        expiryTime: now + DEVICE_ACCESS_TOKEN_TTL_MS,
    }
}

export function presentAgreement(body: LoginAgreementBody, now = Date.now()) {
    return {
        adAgreementStatus: "n",
        agreement: agreementState((now * 1000).toString()),
        agreementPopup: "n",
        appId: body.appId,
        appName: AGREEMENT.appName,
        context: "login",
        country: body.country,
        firstAgreement: "n",
        idpCode: body.idpCode,
        idpId: AGREEMENT.fallbackIdpId,
        informationSecurityCountry: AGREEMENT.informationSecurityCountry,
        kakaoSyncAgreementGetSet: "n",
        kakaoSyncStatus: "off",
        kakaogameSdkVer: AGREEMENT.kakaoGameSdkVersion,
        lang: body.lang,
        partnerId: AGREEMENT.partnerId,
        partnerName: AGREEMENT.partnerName,
        plusFriendStatusInfo: null,
        policyApplyTime: AGREEMENT.policyApplyTime,
    }
}

export function presentZatLogin(
    account: OpenApiAccount,
    session: OpenApiSession,
    lang: string,
) {
    return {
        externalToken: "",
        firstLogin: false,
        player: {
            agreement: agreementState("1717623430484"),
            appId: account.appId,
            firstLoginTime: account.firstLoginTime.getTime(),
            idpAlias: account.idpAlias,
            idpCode: account.idpCode,
            idpId: account.idpId,
            lang,
            lastLoginTime: account.lastLoginTime.getTime(),
            playerId: account.id.toString(),
            pushOption,
            regTime: account.regTime.getTime(),
            status: account.status,
        },
        zat: session.token,
        zatExpiryTime: session.expires.getTime(),
    }
}

export function presentDeviceLogin(
    account: OpenApiAccount,
    idpAlias: string,
    zatSession: OpenApiSession,
    zrtSession: OpenApiSession,
) {
    return {
        externalToken: "",

        // Intentionally preserves the original route behavior. Once we have a
        // verified protocol capture for returning devices, this should become
        // a real isNewAccount value.
        firstLogin: true,

        player: {
            appId: account.appId,
            firstLoginTime: account.firstLoginTime.getTime(),
            idpAlias,
            idpCode: account.idpCode,
            idpId: account.idpId,
            playerId: account.id.toString(),
            pushOption,
            regTime: account.regTime.getTime(),
            status: account.status,
        },
        zat: zatSession.token,
        zatExpiryTime: zatSession.expires.getTime(),
        zrt: zrtSession.token,
        zrtExpiryTime: zrtSession.expires.getTime(),
    }
}
