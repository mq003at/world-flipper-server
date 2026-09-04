import type { AssetVersionProvider } from "../../content/cdn/asset-version";
import type { IdentityService } from "../identity/identity.service";
import type { PlayerSnapshot } from "../player/player.models";
import type { PlayerService } from "../player/player.service";

export interface SignupResult {
    viewerId: number;
}

export interface LoadResult {
    viewerId: number;
    availableAssetVersion: string;
    snapshot: PlayerSnapshot;
}

export class GameBootstrapService {
    constructor(
        private readonly identity: IdentityService,
        private readonly players: PlayerService,
        private readonly assetVersions: AssetVersionProvider,
    ) {}

    signup(zat: string): SignupResult {
        const zatSession = this.identity.requireZat(zat);
        this.players.ensurePlayer(zatSession.accountId);
        const viewerSession = this.identity.getOrCreateViewerSession(zatSession.accountId);

        return {
            viewerId: Number.parseInt(viewerSession.token, 10),
        };
    }

    load(zat: string, viewerId: number): LoadResult {
        const zatSession = this.identity.requireZat(zat);
        this.identity.requireViewer(viewerId, zatSession.accountId);

        return {
            viewerId,
            availableAssetVersion: this.assetVersions.getAvailableAssetVersion(),
            snapshot: this.players.loadForAccount(zatSession.accountId),
        };
    }
}
