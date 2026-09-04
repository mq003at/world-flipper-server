import type { AssetManifestRepository } from "../../content/cdn/asset-manifest.repository";
import type { CdnAvailabilityService } from "../../content/cdn/cdn-availability.service";
import type {
    AssetVersionInfo,
    ClientLanguage,
    ClientPlatform,
    PathList,
} from "../../content/cdn/cdn.models";
import type { AssetVersionProvider } from "../../content/cdn/asset-version";
import type { ModRegistry } from "../../content/cdn/mod-registry";
import type { AssetClientContext } from "./asset.contracts";

const LATEST_MAJOR_FIRST_VERSION = "2.1.0";

const VERSION_INFO: Record<ClientPlatform, Record<ClientLanguage, AssetVersionInfo>> = {
    android: {
        en: {
            baseUrl: "{$cdnAddress}/en/entities/files/",
            filesList: "{$cdnAddress}/en/entities/2.1.125-android_medium.csv",
            totalSize: 8_846_063_846,
            delayedAssetsSize: 6_919_955_738,
        },
        ko: {
            baseUrl: "{$cdnAddress}/ko/entities/files/",
            filesList: "{$cdnAddress}/ko/entities/2.1.121-android_medium.csv",
            totalSize: 8_846_079_322,
            delayedAssetsSize: 6_919_955_738,
        },
        th: {
            baseUrl: "{$cdnAddress}/th/entities/files/",
            filesList: "{$cdnAddress}/th/entities/2.1.124-android_medium.csv",
            totalSize: 8_846_063_872,
            delayedAssetsSize: 6_919_955_738,
        },
    },
    ios: {
        en: {
            baseUrl: "{$cdnAddress}/en/entities/files/",
            filesList: "{$cdnAddress}/en/entities/2.1.125-ios_medium.csv",
            totalSize: 7_928_642_125,
            delayedAssetsSize: 6_362_644_965,
        },
        ko: {
            baseUrl: "{$cdnAddress}/ko/entities/files/",
            filesList: "{$cdnAddress}/ko/entities/2.1.121-ios_medium.csv",
            totalSize: 7_928_642_125,
            delayedAssetsSize: 6_362_644_965,
        },
        th: {
            baseUrl: "{$cdnAddress}/th/entities/files/",
            filesList: "{$cdnAddress}/th/entities/2.1.124-ios_medium.csv",
            totalSize: 7_928_642_125,
            delayedAssetsSize: 6_362_644_965,
        },
    },
};

export class AssetService {
    constructor(
        private readonly manifests: AssetManifestRepository,
        private readonly availability: CdnAvailabilityService,
        private readonly assetVersions: AssetVersionProvider,
        private readonly mods: ModRegistry,
    ) {}

    getVersionInfo(context: AssetClientContext): AssetVersionInfo {
        return VERSION_INFO[context.platform][context.language];
    }

    getPath(context: AssetClientContext): PathList {
        const availableVersion = this.assetVersions.getAvailableAssetVersion();

        if (
            context.currentAssetVersion !== undefined &&
            context.currentAssetVersion !== availableVersion
        ) {
            return {
                info: {
                    client_asset_version: context.currentAssetVersion,
                    target_asset_version: availableVersion,
                    eventual_target_asset_version: availableVersion,
                    is_initial: false,
                    latest_maj_first_version: LATEST_MAJOR_FIRST_VERSION,
                },
                full: {
                    version: availableVersion,
                    archive: [...this.mods.getMods()],
                },
                diff: [],
                asset_version_hash: "",
            };
        }

        const canUseShort = this.availability.hasShortAssets(
            context.language,
            context.platform,
        );
        const size = context.requestFullAssets || !canUseShort ? "full" : "short";

        return this.manifests.getManifest(context.platform, context.language, size);
    }
}
