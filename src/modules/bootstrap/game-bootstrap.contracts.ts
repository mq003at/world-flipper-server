import { InvalidRequestError } from "../../shared/errors/application-error";

export interface ToolSignupRequest {
    accessToken: string;
}

export interface GameLoadRequest {
    accessToken: string;
    viewerId: number;
}

export interface GetHeaderResponseRequest {
    viewerId: number;
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

function requiredPositiveNumber(source: Record<string, unknown>, key: string): number {
    const value = source[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new InvalidRequestError();
    }
    return value;
}

export function parseToolSignupRequest(value: unknown): ToolSignupRequest {
    const source = record(value);
    return {
        accessToken: requiredString(source, "access_token"),
    };
}

export function parseGameLoadRequest(value: unknown): GameLoadRequest {
    const source = record(value);
    return {
        accessToken: requiredString(source, "access_token"),
        viewerId: requiredPositiveNumber(source, "viewer_id"),
    };
}

export function parseGetHeaderResponseRequest(value: unknown): GetHeaderResponseRequest {
    const source = record(value);
    return {
        viewerId: requiredPositiveNumber(source, "viewer_id"),
    };
}
