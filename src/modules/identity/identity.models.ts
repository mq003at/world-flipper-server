export enum SessionType {
    ZAT = 0,
    ZRT = 1,
    VIEWER = 2,
}

export interface Account {
    id: number;
    appId: string;
    firstLoginTime: Date;
    idpAlias: string;
    idpCode: string;
    idpId: string;
    regTime: Date;
    lastLoginTime: Date;
    status: string;
}

export interface Session {
    token: string;
    expires: Date;
    type: SessionType;
    accountId: number;
}

export interface LoginDeviceResult {
    account: Account;
    zat: Session;
    zrt: Session;
    isNewAccount: boolean;
}

export interface LoginWithZatResult {
    account: Account;
    zat: Session;
}
