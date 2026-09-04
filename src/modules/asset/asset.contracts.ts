import type { IncomingHttpHeaders } from "node:http";
import type { ClientLanguage, ClientPlatform } from "../../content/cdn/cdn.models";
import { InvalidRequestError } from "../../shared/errors/application-error";

export interface AssetClientContext {
    platform: ClientPlatform;
    language: ClientLanguage;
    requestFullAssets: boolean;
    currentAssetVersion?: string;
}

export interface GetPathRequest {
    viewerId: number;
    targetAssetVersion?: string;
}

function readHeader(headers: IncomingHttpHeaders, key: string): string | undefined {
    const value = headers[key];
    if (value === undefined) return undefined;
    return Array.isArray(value) ? value[0] : String(value);
}

function normalizeLanguage(raw: string | undefined): ClientLanguage {
    if (raw === "ko" || raw === "th") return raw;
    return "en";
}

function detectPlatform(headers: IncomingHttpHeaders): ClientPlatform {
    const userAgent = readHeader(headers, "user-agent") ?? "";
    const requestedBy = readHeader(headers, "requestedby") ?? "";

    if (userAgent.includes("iOS;") || requestedBy === "ios") return "ios";
    return "android";
}

export function parseAssetClientContext(
    headers: IncomingHttpHeaders,
    options: { requireDeviceLanguage?: boolean } = {},
): AssetClientContext {
    const rawLanguage = readHeader(headers, "device_lang");
    if (options.requireDeviceLanguage && rawLanguage === undefined) {
        throw new InvalidRequestError("Invalid headers provided.");
    }

    return {
        platform: detectPlatform(headers),
        language: normalizeLanguage(rawLanguage),
        requestFullAssets: readHeader(headers, "asset_size") === "fulfill",
        currentAssetVersion: readHeader(headers, "res_ver"),
    };
}

export function parseGetPathRequest(body: unknown): GetPathRequest {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new InvalidRequestError("Invalid asset path request body.");
    }

    const raw = body as Record<string, unknown>;
    const viewerId = Number(raw.viewer_id);
    if (!Number.isFinite(viewerId)) {
        throw new InvalidRequestError("Invalid viewer_id.");
    }

    return {
        viewerId,
        targetAssetVersion:
            typeof raw.target_asset_version === "string"
                ? raw.target_asset_version
                : undefined,
    };
}
