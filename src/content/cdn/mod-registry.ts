import { createHash } from "node:crypto";
import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    statSync,
    writeFileSync,
} from "node:fs";
import path from "node:path";
import type { CdnMetadata, PathListArchive } from "./cdn.models";

const DEFAULT_CDN_VERSION = 125;

function defaultMetadata(): CdnMetadata {
    return {
        version: DEFAULT_CDN_VERSION,
        mods: [],
    };
}

function readMetadata(filePath: string): CdnMetadata {
    if (!existsSync(filePath)) return defaultMetadata();

    try {
        const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<CdnMetadata>;
        if (!Number.isInteger(parsed.version) || !Array.isArray(parsed.mods)) {
            return defaultMetadata();
        }

        return {
            version: parsed.version as number,
            mods: parsed.mods as PathListArchive[],
        };
    } catch {
        return defaultMetadata();
    }
}

function hashFile(filePath: string): string {
    return createHash("sha256").update(readFileSync(filePath)).digest("base64");
}

function sameArchives(left: PathListArchive[], right: PathListArchive[]): boolean {
    if (left.length !== right.length) return false;

    for (let index = 0; index < left.length; index += 1) {
        const a = left[index];
        const b = right[index];
        if (
            a.location !== b.location ||
            a.size !== b.size ||
            a.sha256 !== b.sha256
        ) {
            return false;
        }
    }

    return true;
}

export class ModRegistry {
    private state: CdnMetadata = defaultMetadata();

    constructor(private readonly cdnDir: string) {}

    initialize(): void {
        const metadataPath = path.join(this.cdnDir, "metadata.json");
        const previous = readMetadata(metadataPath);
        const modsDir = path.join(this.cdnDir, "mods");

        if (!existsSync(modsDir)) {
            this.state = previous;
            return;
        }

        const currentMods = readdirSync(modsDir)
            .sort((left, right) => left.localeCompare(right))
            .flatMap((fileName): PathListArchive[] => {
                const filePath = path.join(modsDir, fileName);
                const stats = statSync(filePath);
                if (!stats.isFile()) return [];

                return [{
                    location: `{$cdnAddress}/mods/${fileName}`,
                    size: stats.size,
                    sha256: hashFile(filePath),
                }];
            });

        if (sameArchives(previous.mods, currentMods)) {
            this.state = previous;
            return;
        }

        this.state = {
            version: previous.version + 1,
            mods: currentMods,
        };

        mkdirSync(this.cdnDir, { recursive: true });
        writeFileSync(metadataPath, JSON.stringify(this.state), "utf8");
    }

    getVersion(): number {
        return this.state.version;
    }

    getMods(): readonly PathListArchive[] {
        return this.state.mods;
    }
}
