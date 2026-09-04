import type { Clock } from "../../infrastructure/clock/clock";
import { OPENAPI } from "../../protocol/kakao/openapi.constants";
import type { LoginAgreementRequest, ZatLoginRequest } from "../../protocol/kakao/openapi.contracts";
import type { Account, LoginDeviceResult, LoginWithZatResult } from "./identity.models";

function playerResponse(account: Account, lang?: string) {
    return {
        agreement: lang === undefined
            ? undefined
            : {
                E001: "y",
                E002: "y",
                E006: "y",
                N002: "n",
                N003: "n",
                timestamp: OPENAPI.capturedAgreementTimestamp,
            },
        appId: account.appId,
        firstLoginTime: account.firstLoginTime.getTime(),
        idpAlias: account.idpAlias,
        idpCode: account.idpCode,
        idpId: account.idpId,
        lang,
        lastLoginTime: lang === undefined ? undefined : account.lastLoginTime.getTime(),
        playerId: account.id.toString(),
        pushOption: {
            night: "n",
            player: "n",
        },
        regTime: account.regTime.getTime(),
        status: account.status,
    };
}

function omitUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(value).filter(([, field]) => field !== undefined),
    ) as Partial<T>;
}

export function presentLoginDevice(result: LoginDeviceResult) {
    return {
        externalToken: "",
        // Legacy Starpoint always returned true here, even for an existing account.
        // Keep the wire behavior stable during the first migration slice.
        firstLogin: true,
        player: omitUndefined(playerResponse(result.account)),
        zat: result.zat.token,
        zatExpiryTime: result.zat.expires.getTime(),
        zrt: result.zrt.token,
        zrtExpiryTime: result.zrt.expires.getTime(),
    };
}

export function presentZatLogin(result: LoginWithZatResult, request: ZatLoginRequest) {
    return {
        externalToken: "",
        firstLogin: false,
        player: omitUndefined(playerResponse(result.account, request.lang)),
        zat: result.zat.token,
        zatExpiryTime: result.zat.expires.getTime(),
    };
}

export function presentAgreement(request: LoginAgreementRequest, clock: Clock) {
    return {
        adAgreementStatus: "n",
        agreement: {
            E001: "y",
            E002: "y",
            E006: "y",
            N002: "n",
            N003: "n",
            timestamp: (clock.now().getTime() * 1000).toString(),
        },
        agreementPopup: "n",
        appId: request.appId,
        appName: "World Flipper (NA)",
        context: "login",
        country: request.country,
        firstAgreement: "n",
        idpCode: request.idpCode,
        idpId: OPENAPI.capturedAgreementIdpId,
        informationSecurityCountry: "kr",
        kakaoSyncAgreementGetSet: "n",
        kakaoSyncStatus: "off",
        kakaogameSdkVer: "3.0",
        lang: request.lang,
        partnerId: 825,
        partnerName: "주식회사 카카오게임즈",
        plusFriendStatusInfo: null,
        policyApplyTime: 1630854000000,
    };
}
