import assert from "node:assert/strict";
import test from "node:test";
import type { Clock } from "../../src/infrastructure/clock/clock";
import type { TokenGenerator } from "../../src/infrastructure/security/token-generator";
import type { Account, Session, SessionType } from "../../src/modules/identity/identity.models";
import type { CreateAccountInput, IdentityRepository } from "../../src/modules/identity/identity.repository";
import { IdentityService } from "../../src/modules/identity/identity.service";

class FixedClock implements Clock {
    constructor(private readonly value: Date) {}
    now(): Date { return new Date(this.value); }
}

class SequenceTokens implements TokenGenerator {
    private next = 0;
    createSessionToken(): string { return `token-${++this.next}`; }
    createViewerId(): number { return 123456789; }
}

class MemoryIdentityRepository implements IdentityRepository {
    private nextAccountId = 1;
    readonly accounts = new Map<number, Account>();
    readonly sessions = new Map<string, Session>();

    findAccountById(accountId: number): Account | null {
        return this.accounts.get(accountId) ?? null;
    }

    findAccountByIdpId(idpId: string): Account | null {
        return [...this.accounts.values()].find((account) => account.idpId === idpId) ?? null;
    }

    createAccount(input: CreateAccountInput): Account {
        const account = { id: this.nextAccountId++, ...input };
        this.accounts.set(account.id, account);
        return account;
    }

    updateAccount(accountId: number, changes: Partial<Omit<Account, "id">>): Account {
        const account = this.accounts.get(accountId);
        if (!account) throw new Error("missing account");
        Object.assign(account, changes);
        return account;
    }

    findSession(token: string): Session | null {
        return this.sessions.get(token) ?? null;
    }

    findSessionsByType(accountId: number, type: SessionType): Session[] {
        return [...this.sessions.values()].filter(
            (session) => session.accountId === accountId && session.type === type,
        );
    }

    insertSession(session: Session): Session {
        this.sessions.set(session.token, session);
        return session;
    }

    deleteSession(token: string): void {
        this.sessions.delete(token);
    }

    deleteSessionsByType(accountId: number, type: SessionType): void {
        for (const [token, session] of this.sessions.entries()) {
            if (session.accountId === accountId && session.type === type) this.sessions.delete(token);
        }
    }

    transaction<T>(work: () => T): T { return work(); }
}

test("loginDevice creates a guest account and ZAT/ZRT sessions", () => {
    const repository = new MemoryIdentityRepository();
    const service = new IdentityService(
        repository,
        new FixedClock(new Date("2026-09-04T12:00:00.000Z")),
        new SequenceTokens(),
    );

    const result = service.loginDevice({
        request: {
            appId: "561429",
            deviceId: "device-1",
            serialNo: "serial-1",
            whiteKey: "guest-secret",
        },
    });

    assert.equal(result.isNewAccount, true);
    assert.equal(result.account.idpAlias, "561429:device-1:serial-1");
    assert.equal(result.account.idpCode, "zd3");
    assert.equal(result.zat.token, "token-1");
    assert.equal(result.zrt.token, "token-2");
});
