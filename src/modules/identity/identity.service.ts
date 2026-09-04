import type { Clock } from "../../infrastructure/clock/clock";
import type { TokenGenerator } from "../../infrastructure/security/token-generator";
import { buildIdpAlias } from "../../protocol/kakao/idp-alias";
import { OPENAPI } from "../../protocol/kakao/openapi.constants";
import type {
    AuthLoginDeviceRequest,
    ZatLoginRequest,
} from "../../protocol/kakao/openapi.contracts";
import {
    InvalidCredentialsError,
    InvalidRequestError,
    InvariantError,
} from "../../shared/errors/application-error";
import type {
    Account,
    LoginDeviceResult,
    LoginWithZatResult,
    Session,
} from "./identity.models";
import { SessionType } from "./identity.models";
import type { IdentityRepository } from "./identity.repository";

export interface LoginDeviceCommand {
    request: AuthLoginDeviceRequest;
    requestedAccountId?: number;
}

export class IdentityService {
    constructor(
        private readonly repository: IdentityRepository,
        private readonly clock: Clock,
        private readonly tokens: TokenGenerator,
    ) {}

    createDeviceAccessToken(): { accessToken: string; expiryTime: number } {
        return {
            accessToken: OPENAPI.deviceAccessToken,
            expiryTime: this.clock.now().getTime() + OPENAPI.deviceAccessTokenTtlMs,
        };
    }

    loginDevice(command: LoginDeviceCommand): LoginDeviceResult {
        const { request, requestedAccountId } = command;
        const now = this.clock.now();
        const idpAlias = buildIdpAlias(request.appId, request.deviceId, request.serialNo);
        const idpId = request.whiteKey;

        return this.repository.transaction(() => {
            const existingAccount =
                requestedAccountId === undefined
                    ? this.repository.findAccountByIdpId(idpId)
                    : this.repository.findAccountById(requestedAccountId);

            const isNewAccount = existingAccount === null;
            let account = existingAccount ?? this.repository.createAccount({
                appId: request.appId,
                firstLoginTime: now,
                idpAlias,
                idpCode: OPENAPI.guestIdpCode,
                idpId,
                regTime: now,
                lastLoginTime: now,
                status: "normal",
            });

            if (account.idpId !== idpId) {
                throw new InvalidRequestError("Invalid playerId provided.");
            }

            if (requestedAccountId !== undefined) {
                this.repository.deleteSessionsByType(account.id, SessionType.ZAT);
                this.repository.deleteSessionsByType(account.id, SessionType.ZRT);
            }

            if (account.idpAlias !== idpAlias) {
                account = this.repository.updateAccount(account.id, { idpAlias });
            }

            const zat = this.createSession(account.id, SessionType.ZAT, OPENAPI.zatTtlMs);
            const zrt = this.createSession(account.id, SessionType.ZRT, OPENAPI.zrtTtlMs);

            return { account, zat, zrt, isNewAccount };
        });
    }

    loginWithZat(request: ZatLoginRequest): LoginWithZatResult {
        return this.repository.transaction(() => {
            let session = this.getUsableSession(request.zat);

            if (session === null) {
                // Compatibility behavior from legacy Starpoint. ZAT login does not
                // provide serialNo, so the old implementation used OS as the third
                // alias component. Preserve until captured traffic proves a better rule.
                const idpAlias = buildIdpAlias(request.appId, request.deviceId, request.os);
                const accountId = Number.parseInt(request.playerId, 10);
                const account = Number.isNaN(accountId)
                    ? null
                    : this.repository.findAccountById(accountId);

                if (account?.idpAlias === idpAlias) {
                    this.repository.deleteSessionsByType(account.id, SessionType.ZAT);
                    session = this.createSession(account.id, SessionType.ZAT, OPENAPI.zatTtlMs);
                }
            }

            if (session === null || session.type !== SessionType.ZAT) {
                throw new InvalidCredentialsError("Invalid zat provided.");
            }

            let account = this.repository.findAccountById(session.accountId);
            if (!account) {
                throw new InvariantError("No account assigned to session.");
            }

            account = this.repository.updateAccount(account.id, {
                lastLoginTime: this.clock.now(),
            });

            this.repository.deleteSession(session.token);
            const zat = this.createSession(account.id, SessionType.ZAT, OPENAPI.zatTtlMs);

            return { account, zat };
        });
    }

    private getUsableSession(token: string): Session | null {
        const session = this.repository.findSession(token);
        if (!session) return null;

        if (session.type !== SessionType.VIEWER && this.clock.now() >= session.expires) {
            this.repository.deleteSession(session.token);
            return null;
        }

        return session;
    }

    private createSession(accountId: number, type: SessionType, ttlMs: number): Session {
        const now = this.clock.now();
        const session: Session = {
            token: this.tokens.createSessionToken(),
            accountId,
            type,
            expires: new Date(now.getTime() + ttlMs),
        };

        return this.repository.insertSession(session);
    }
}
