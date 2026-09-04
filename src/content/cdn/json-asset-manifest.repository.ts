import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { AssetManifestRepository } from "./asset-manifest.repository";
import type {
    AssetManifestSize,
    ClientLanguage,
    ClientPlatform,
    PathList,
} from "./cdn.models";

export class AssetManifestNotFoundError extends Error {
    constructor(filePath: string) {
        super(`Asset manifest not found: ${filePath}`);
        this.name = "AssetManifestNotFoundError";
    }
}

export class InvalidAssetManifestError extends Error {
    constructor(filePath: string) {
        super(`Invalid asset manifest: ${filePath}`);
        this.name = "InvalidAssetManifestError";
    }
}

export class JsonAssetManifestRepository implements AssetManifestRepository {
    private readonly cache = new Map<string, PathList>();

    constructor(private readonly manifestDir: string) {}

    getManifest(
        platform: ClientPlatform,
        language: ClientLanguage,
        size: AssetManifestSize,
    ): PathList {
        const effectiveSize: AssetManifestSize = platform === "ios" ? "full" : size;
        const fileName = `${language}-${platform}-${effectiveSize}.json`;
        const cached = this.cache.get(fileName);
        if (cached) return cached;

        const filePath = path.join(this.manifestDir, fileName);
        if (!existsSync(filePath)) throw new AssetManifestNotFoundError(filePath);

        const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
        if (!isPathList(parsed)) throw new InvalidAssetManifestError(filePath);

        this.cache.set(fileName, parsed);
        return parsed;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPathList(value: unknown): value is PathList {
    if (!isRecord(value)) return false;
    if (!isRecord(value.info) || !isRecord(value.full)) return false;
    if (!Array.isArray(value.full.archive) || !Array.isArray(value.diff)) return false;
    if (typeof value.asset_version_hash !== "string") return false;
    if (typeof value.full.version !== "string") return false;
    if (typeof value.info.eventual_target_asset_version !== "string") return false;
    if (typeof value.info.is_initial !== "boolean") return false;
    if (typeof value.info.latest_maj_first_version !== "string") return false;
    return true;
}
