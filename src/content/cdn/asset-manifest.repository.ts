import type {
    AssetManifestSize,
    ClientLanguage,
    ClientPlatform,
    PathList,
} from "./cdn.models";

export interface AssetManifestRepository {
    getManifest(
        platform: ClientPlatform,
        language: ClientLanguage,
        size: AssetManifestSize,
    ): PathList;
}
