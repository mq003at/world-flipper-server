import type { ModRegistry } from "./mod-registry";

export interface AssetVersionProvider {
    getAvailableAssetVersion(): string;
}

export class CdnAssetVersionProvider implements AssetVersionProvider {
    constructor(private readonly mods: ModRegistry) {}

    getAvailableAssetVersion(): string {
        return `2.1.${this.mods.getVersion()}`;
    }
}
