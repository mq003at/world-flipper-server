import { existsSync } from "node:fs";
import path from "node:path";
import type { ClientLanguage, ClientPlatform } from "./cdn.models";

const BASE_ASSET_VERSION: Record<ClientLanguage, string> = {
    en: "2.1.125",
    ko: "2.1.121",
    th: "2.1.124",
};

export class CdnAvailabilityService {
    constructor(private readonly cdnDir: string) {}

    hasShortAssets(language: ClientLanguage, platform: ClientPlatform): boolean {
        if (platform !== "android") return false;

        const entitiesDir = path.join(this.cdnDir, language, "entities");
        const filesDir = path.join(entitiesDir, "files");
        const mediumList = path.join(
            entitiesDir,
            `${BASE_ASSET_VERSION[language]}-android_medium.csv`,
        );

        return existsSync(filesDir) && existsSync(mediumList);
    }
}
