export type ClientPlatform = "android" | "ios";
export type ClientLanguage = "en" | "ko" | "th";
export type AssetManifestSize = "full" | "short";

export interface PathListArchive {
    location: string;
    size: number;
    sha256: string;
}

export interface PathListInfo {
    client_asset_version?: string;
    target_asset_version: string;
    eventual_target_asset_version: string;
    is_initial: boolean;
    latest_maj_first_version: string;
}

export interface PathList {
    info: PathListInfo;
    full: {
        version: string;
        archive: PathListArchive[];
    };
    diff: unknown[];
    asset_version_hash: string;
}

export interface CdnMetadata {
    version: number;
    mods: PathListArchive[];
}

export interface AssetVersionInfo {
    baseUrl: string;
    filesList: string;
    totalSize: number;
    delayedAssetsSize: number;
}
