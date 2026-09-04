import type { DatabaseConnection } from "../../infrastructure/database/database";
import type { Account, Session } from "./identity.models";
import { SessionType } from "./identity.models";
import type { CreateAccountInput, IdentityRepository } from "./identity.repository";

interface AccountRow {
    id: number;
    app_id: string;
    first_login_time: string;
    idp_alias: string;
    idp_code: string;
    idp_id: string;
    reg_time: string;
    last_login_time: string;
    status: string;
}

interface SessionRow {
    token: string;
    account_id: number;
    expires: string;
    type: number;
}

function mapAccount(row: AccountRow): Account {
    return {
        id: row.id,
        appId: row.app_id,
        firstLoginTime: new Date(row.first_login_time),
        idpAlias: row.idp_alias,
        idpCode: row.idp_code,
        idpId: row.idp_id,
        regTime: new Date(row.reg_time),
        lastLoginTime: new Date(row.last_login_time),
        status: row.status,
    };
}

function mapSession(row: SessionRow): Session {
    return {
        token: row.token,
        accountId: row.account_id,
        expires: new Date(row.expires),
        type: row.type as SessionType,
    };
}

const accountSelect = `
    SELECT id, app_id, first_login_time, idp_alias, idp_code,
           idp_id, reg_time, last_login_time, status
    FROM accounts
`;

export class SqliteIdentityRepository implements IdentityRepository {
    constructor(private readonly database: DatabaseConnection) {}

    findAccountById(accountId: number): Account | null {
        const row = this.database
            .prepare(`${accountSelect} WHERE id = ?`)
            .get(accountId) as AccountRow | undefined;

        return row ? mapAccount(row) : null;
    }

    findAccountByIdpId(idpId: string): Account | null {
        const row = this.database
            .prepare(`${accountSelect} WHERE idp_id = ?`)
            .get(idpId) as AccountRow | undefined;

        return row ? mapAccount(row) : null;
    }

    createAccount(input: CreateAccountInput): Account {
        const result = this.database
            .prepare(`
                INSERT INTO accounts (
                    app_id, first_login_time, idp_alias, idp_code, idp_id,
                    reg_time, last_login_time, status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
                input.appId,
                input.firstLoginTime.toISOString(),
                input.idpAlias,
                input.idpCode,
                input.idpId,
                input.regTime.toISOString(),
                input.lastLoginTime.toISOString(),
                input.status,
            );

        const account = this.findAccountById(Number(result.lastInsertRowid));
        if (!account) throw new Error("Created account could not be read back.");
        return account;
    }

    updateAccount(accountId: number, changes: Partial<Omit<Account, "id">>): Account {
        const fieldMap: Record<keyof Omit<Account, "id">, string> = {
            appId: "app_id",
            firstLoginTime: "first_login_time",
            idpAlias: "idp_alias",
            idpCode: "idp_code",
            idpId: "idp_id",
            regTime: "reg_time",
            lastLoginTime: "last_login_time",
            status: "status",
        };

        const sets: string[] = [];
        const values: unknown[] = [];

        for (const [key, rawValue] of Object.entries(changes) as Array<
            [keyof Omit<Account, "id">, Account[keyof Omit<Account, "id">]]
        >) {
            if (rawValue === undefined) continue;
            sets.push(`${fieldMap[key]} = ?`);
            values.push(rawValue instanceof Date ? rawValue.toISOString() : rawValue);
        }

        if (sets.length > 0) {
            this.database
                .prepare(`UPDATE accounts SET ${sets.join(", ")} WHERE id = ?`)
                .run(...values, accountId);
        }

        const account = this.findAccountById(accountId);
        if (!account) throw new Error(`Account ${accountId} does not exist.`);
        return account;
    }

    findSession(token: string): Session | null {
        const row = this.database
            .prepare(`
                SELECT token, account_id, expires, type
                FROM sessions
                WHERE token = ?
            `)
            .get(token) as SessionRow | undefined;

        return row ? mapSession(row) : null;
    }

    insertSession(session: Session): Session {
        this.database
            .prepare(`
                INSERT INTO sessions (token, account_id, expires, type)
                VALUES (?, ?, ?, ?)
            `)
            .run(
                session.token,
                session.accountId,
                session.expires.toISOString(),
                session.type,
            );

        return session;
    }

    deleteSession(token: string): void {
        this.database.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    }

    deleteSessionsByType(accountId: number, type: SessionType): void {
        this.database
            .prepare("DELETE FROM sessions WHERE account_id = ? AND type = ?")
            .run(accountId, type);
    }

    transaction<T>(work: () => T): T {
        return this.database.transaction(work)();
    }
}
