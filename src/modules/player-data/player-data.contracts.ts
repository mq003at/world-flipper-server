import { InvalidRequestError } from "../../shared/errors/application-error";

export interface PlayerDataExportInput {
    viewerId: number;
}

export interface PlayerDataImportInput {
    viewerId: number;
    replace: true;
    save: unknown;
}

function requireObject(value: unknown): Record<string, unknown> {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new InvalidRequestError();
    }
    return value as Record<string, unknown>;
}

function requireViewerId(value: unknown): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
        throw new InvalidRequestError("Invalid viewer id.");
    }
    return value;
}

export function parsePlayerDataExportRequest(body: unknown): PlayerDataExportInput {
    const value = requireObject(body);
    return { viewerId: requireViewerId(value.viewer_id) };
}

export function parsePlayerDataImportRequest(body: unknown): PlayerDataImportInput {
    const value = requireObject(body);
    if (value.replace !== true) {
        throw new InvalidRequestError("Import requires replace=true.");
    }
    if (!("save" in value)) throw new InvalidRequestError("Missing player save.");
    return {
        viewerId: requireViewerId(value.viewer_id),
        replace: true,
        save: value.save,
    };
}
