import { InvalidRequestError } from "../../shared/errors/application-error";

export interface ZatLoginRequest {
    appId: string;
    deviceId: string;
    lang: string;
    os: string;
    playerId: string;
    zat: string;
}

export interface AuthLoginDeviceRequest {
    appId: string;
    deviceId: string;
    serialNo: string;
    whiteKey: string;
}

export interface LoginAgreementRequest {
    appId: string;
    country: string;
    idpCode: string;
    lang: string;
}

function record(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new InvalidRequestError();
    }
    return value as Record<string, unknown>;
}

function requiredString(source: Record<string, unknown>, key: string): string {
    const value = source[key];
    if (typeof value !== "string" || value.length === 0) {
        throw new InvalidRequestError();
    }
    return value;
}

export function parseZatLoginRequest(value: unknown): ZatLoginRequest {
    const source = record(value);
    return {
        appId: requiredString(source, "appId"),
        deviceId: requiredString(source, "deviceId"),
        lang: requiredString(source, "lang"),
        os: requiredString(source, "os"),
        playerId: requiredString(source, "playerId"),
        zat: requiredString(source, "zat"),
    };
}

export function parseAuthLoginDeviceRequest(value: unknown): AuthLoginDeviceRequest {
    const source = record(value);
    return {
        appId: requiredString(source, "appId"),
        deviceId: requiredString(source, "deviceId"),
        serialNo: requiredString(source, "serialNo"),
        whiteKey: requiredString(source, "whiteKey"),
    };
}

export function parseLoginAgreementRequest(value: unknown): LoginAgreementRequest {
    const source = record(value);
    return {
        appId: requiredString(source, "appId"),
        country: requiredString(source, "country"),
        idpCode: requiredString(source, "idpCode"),
        lang: requiredString(source, "lang"),
    };
}
