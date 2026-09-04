import type { Account, Session, SessionType } from "./identity.models";

export interface CreateAccountInput {
    appId: string;
    firstLoginTime: Date;
    idpAlias: string;
    idpCode: string;
    idpId: string;
    regTime: Date;
    lastLoginTime: Date;
    status: string;
}

export interface IdentityRepository {
    findAccountById(accountId: number): Account | null;
    findAccountByIdpId(idpId: string): Account | null;
    createAccount(input: CreateAccountInput): Account;
    updateAccount(accountId: number, changes: Partial<Omit<Account, "id">>): Account;

    findSession(token: string): Session | null;
    insertSession(session: Session): Session;
    deleteSession(token: string): void;
    deleteSessionsByType(accountId: number, type: SessionType): void;

    transaction<T>(work: () => T): T;
}
