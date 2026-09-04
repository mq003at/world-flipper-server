import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface AssetVersionProvider {
    getAvailableAssetVersion(): string;
}

interface CdnMetadata {
    version?: unknown;
}

export class CdnAssetVersionProvider implements AssetVersionProvider {
    private readonly availableAssetVersion: string;

    constructor(cdnDir: string, fallbackPatchVersion = 125) {
        this.availableAssetVersion = `2.1.${this.readPatchVersion(cdnDir, fallbackPatchVersion)}`;
    }

    getAvailableAssetVersion(): string {
        return this.availableAssetVersion;
    }

    private readPatchVersion(cdnDir: string, fallback: number): number {
        const metadataPath = path.join(cdnDir, "metadata.json");
        if (!existsSync(metadataPath)) return fallback;

        try {
            const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as CdnMetadata;
            return typeof metadata.version === "number" && Number.isInteger(metadata.version)
                ? metadata.version
                : fallback;
        } catch {
            return fallback;
        }
    }
}
