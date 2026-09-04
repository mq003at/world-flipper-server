"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presentDeviceLogin = exports.presentZatLogin = exports.presentAgreement = exports.presentDeviceAccessToken = exports.presentCountry = void 0;
const openapi_constants_1 = require("./openapi.constants");
const pushOption = {
    night: "n",
    player: "n",
};
function agreementState(timestamp) {
    return {
        E001: "y",
        E002: "y",
        E006: "y",
        N002: "n",
        N003: "n",
        timestamp,
    };
}
function presentCountry() {
    return { country: "en" };
}
exports.presentCountry = presentCountry;
function presentDeviceAccessToken(now = Date.now()) {
    return {
        accessToken: openapi_constants_1.DEVICE_ACCESS_TOKEN,
        expiryTime: now + openapi_constants_1.DEVICE_ACCESS_TOKEN_TTL_MS,
    };
}
exports.presentDeviceAccessToken = presentDeviceAccessToken;
function presentAgreement(body, now = Date.now()) {
    return {
        adAgreementStatus: "n",
        agreement: agreementState((now * 1000).toString()),
        agreementPopup: "n",
        appId: body.appId,
        appName: openapi_constants_1.AGREEMENT.appName,
        context: "login",
        country: body.country,
        firstAgreement: "n",
        idpCode: body.idpCode,
        idpId: openapi_constants_1.AGREEMENT.fallbackIdpId,
        informationSecurityCountry: openapi_constants_1.AGREEMENT.informationSecurityCountry,
        kakaoSyncAgreementGetSet: "n",
        kakaoSyncStatus: "off",
        kakaogameSdkVer: openapi_constants_1.AGREEMENT.kakaoGameSdkVersion,
        lang: body.lang,
        partnerId: openapi_constants_1.AGREEMENT.partnerId,
        partnerName: openapi_constants_1.AGREEMENT.partnerName,
        plusFriendStatusInfo: null,
        policyApplyTime: openapi_constants_1.AGREEMENT.policyApplyTime,
    };
}
exports.presentAgreement = presentAgreement;
function presentZatLogin(account, session, lang) {
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
    };
}
exports.presentZatLogin = presentZatLogin;
function presentDeviceLogin(account, idpAlias, zatSession, zrtSession) {
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
    };
}
exports.presentDeviceLogin = presentDeviceLogin;
