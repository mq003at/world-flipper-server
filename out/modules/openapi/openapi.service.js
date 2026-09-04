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
exports.OpenApiService = void 0;
const utils_1 = require("../../utils");
const openapi_constants_1 = require("./openapi.constants");
const openapi_errors_1 = require("./openapi.errors");
const openapi_repository_1 = require("./openapi.repository");
function expiresIn(milliseconds) {
    return new Date(Date.now() + milliseconds);
}
function parsePlayerId(rawPlayerId) {
    if (rawPlayerId === undefined || rawPlayerId.trim() === "") {
        return undefined;
    }
    const playerId = Number.parseInt(rawPlayerId, 10);
    if (!Number.isFinite(playerId)) {
        throw openapi_errors_1.OpenApiHttpError.badRequest("Invalid playerId provided.");
    }
    return playerId;
}
function createSession(accountId, type) {
    return __awaiter(this, void 0, void 0, function* () {
        const ttl = type === openapi_repository_1.openApiRepository.sessionType.ZAT ? openapi_constants_1.ZAT_TTL_MS : openapi_constants_1.ZRT_TTL_MS;
        return openapi_repository_1.openApiRepository.insertSession({
            expires: expiresIn(ttl),
            accountId,
            type,
        });
    });
}
function restoreZatSession(body) {
    return __awaiter(this, void 0, void 0, function* () {
        // This deliberately preserves the original algorithm. Note that loginDevice
        // generates an alias with serialNo while this fallback uses os. That mismatch
        // deserves a protocol-level investigation before we change behavior.
        const idpAlias = (0, utils_1.generateIdpAlias)(body.appId, body.deviceId, body.os);
        const accountId = Number.parseInt(body.playerId, 10);
        if (!Number.isFinite(accountId)) {
            return null;
        }
        const account = yield openapi_repository_1.openApiRepository.getAccount(accountId);
        if (!account || account.idpAlias !== idpAlias) {
            return null;
        }
        yield openapi_repository_1.openApiRepository.deleteAccountSessionsOfType(account.id, openapi_repository_1.openApiRepository.sessionType.ZAT);
        return createSession(account.id, openapi_repository_1.openApiRepository.sessionType.ZAT);
    });
}
class OpenApiService {
    loginWithZat(body) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!body.zat) {
                throw openapi_errors_1.OpenApiHttpError.badRequest("Invalid request body.");
            }
            let session = yield openapi_repository_1.openApiRepository.getSession(body.zat);
            if (session === null) {
                session = yield restoreZatSession(body);
            }
            if (session === null || session.type !== openapi_repository_1.openApiRepository.sessionType.ZAT) {
                throw openapi_errors_1.OpenApiHttpError.badRequest("Invalid zat provided.");
            }
            let account;
            try {
                account = yield openapi_repository_1.openApiRepository.updateAccount({
                    id: session.accountId,
                    lastLoginTime: new Date(),
                });
            }
            catch (error) {
                throw openapi_errors_1.OpenApiHttpError.internal("No account assigned to session.");
            }
            if (!account) {
                throw openapi_errors_1.OpenApiHttpError.internal("No account assigned to session.");
            }
            // Rotate the ZAT after successful authentication.
            yield openapi_repository_1.openApiRepository.deleteSession(session.token);
            const newSession = yield createSession(account.id, openapi_repository_1.openApiRepository.sessionType.ZAT);
            return {
                account,
                session: newSession,
            };
        });
    }
    loginDevice(body, rawPlayerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { appId, deviceId, serialNo } = body;
            if (!appId || !deviceId || !serialNo) {
                throw openapi_errors_1.OpenApiHttpError.badRequest("Invalid request body.");
            }
            const accountId = parsePlayerId(rawPlayerId);
            const idpAlias = (0, utils_1.generateIdpAlias)(appId, deviceId, serialNo);
            const idpId = body.whiteKey;
            const existingAccount = accountId === undefined
                ? openapi_repository_1.openApiRepository.getAccountFromIdpId(idpId)
                : yield openapi_repository_1.openApiRepository.getAccount(accountId);
            const account = existingAccount === null
                ? yield openapi_repository_1.openApiRepository.insertAccount({
                    appId,
                    idpAlias,
                    idpCode: openapi_constants_1.DEFAULT_IDP_CODE,
                    idpId,
                    status: "normal",
                })
                : existingAccount;
            if (account === null || account.idpId !== idpId) {
                throw openapi_errors_1.OpenApiHttpError.badRequest("Invalid playerId provided.");
            }
            if (accountId !== undefined) {
                yield openapi_repository_1.openApiRepository.deleteAccountSessionsOfType(account.id, openapi_repository_1.openApiRepository.sessionType.ZAT);
                yield openapi_repository_1.openApiRepository.deleteAccountSessionsOfType(account.id, openapi_repository_1.openApiRepository.sessionType.ZRT);
            }
            if (existingAccount === null || existingAccount.idpAlias !== idpAlias) {
                yield openapi_repository_1.openApiRepository.updateAccount({
                    id: account.id,
                    idpAlias,
                });
            }
            const zatSession = yield createSession(account.id, openapi_repository_1.openApiRepository.sessionType.ZAT);
            const zrtSession = yield createSession(account.id, openapi_repository_1.openApiRepository.sessionType.ZRT);
            return {
                account,
                idpAlias,
                zatSession,
                zrtSession,
            };
        });
    }
}
exports.OpenApiService = OpenApiService;
