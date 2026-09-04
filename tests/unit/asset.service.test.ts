import assert from "node:assert/strict";
import test from "node:test";
import type { AssetManifestRepository } from "../../src/content/cdn/asset-manifest.repository";
import type { CdnAvailabilityService } from "../../src/content/cdn/cdn-availability.service";
import type { PathList } from "../../src/content/cdn/cdn.models";
import type { AssetVersionProvider } from "../../src/content/cdn/asset-version";
import type { ModRegistry } from "../../src/content/cdn/mod-registry";
import { AssetService } from "../../src/modules/asset/asset.service";

const shortManifest: PathList = {
    info: {
        target_asset_version: "2.1.125",
        eventual_target_asset_version: "2.1.125",
        is_initial: true,
        latest_maj_first_version: "2.1.0",
    },
    full: { version: "2.1.0", archive: [] },
    diff: [],
    asset_version_hash: "short",
};

const fullManifest: PathList = {
    ...shortManifest,
    asset_version_hash: "full",
};

class FakeManifestRepository implements AssetManifestRepository {
    getManifest(_platform: "android" | "ios", _language: "en" | "ko" | "th", size: "full" | "short"): PathList {
        return size === "short" ? shortManifest : fullManifest;
    }
}

class FakeAvailability {
    constructor(private readonly available: boolean) {}
    hasShortAssets(): boolean {
        return this.available;
    }
}

class FakeVersions implements AssetVersionProvider {
    getAvailableAssetVersion(): string {
        return "2.1.126";
    }
}

class FakeMods {
    getMods() {
        return [{ location: "{$cdnAddress}/mods/season.zip", size: 123, sha256: "abc" }];
    }
}

function createService(shortAvailable: boolean): AssetService {
    return new AssetService(
        new FakeManifestRepository(),
        new FakeAvailability(shortAvailable) as unknown as CdnAvailabilityService,
        new FakeVersions(),
        new FakeMods() as unknown as ModRegistry,
    );
}

test("initial Android install uses short manifest when delayed entities are available", () => {
    const result = createService(true).getPath({
        platform: "android",
        language: "en",
        requestFullAssets: false,
    });

    assert.equal(result.asset_version_hash, "short");
});

test("fulfill requests always use the full manifest", () => {
    const result = createService(true).getPath({
        platform: "android",
        language: "en",
        requestFullAssets: true,
    });

    assert.equal(result.asset_version_hash, "full");
});

test("short requests fall back to full manifest when entity store is unavailable", () => {
    const result = createService(false).getPath({
        platform: "android",
        language: "en",
        requestFullAssets: false,
    });

    assert.equal(result.asset_version_hash, "full");
});

test("outdated client versions receive only registered mod archives", () => {
    const result = createService(true).getPath({
        platform: "android",
        language: "en",
        requestFullAssets: false,
        currentAssetVersion: "2.1.125",
    });

    assert.equal(result.info.client_asset_version, "2.1.125");
    assert.equal(result.info.target_asset_version, "2.1.126");
    assert.equal(result.info.is_initial, false);
    assert.equal(result.full.version, "2.1.126");
    assert.equal(result.full.archive.length, 1);
});
