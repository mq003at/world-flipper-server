import type { AssetVersionProvider } from "../../content/cdn/asset-version";
import { NOOP_GAMEPLAY_EVENT_SINK, type GameplayEventSink } from "../../live/gameplay-events/gameplay-event-sink";
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
    mailArrived: boolean;
}

export interface MailArrivalReader {
    hasArrivedForPlayer(playerId: number): boolean;
}

export class GameBootstrapService {
    constructor(
        private readonly identity: IdentityService,
        private readonly players: PlayerService,
        private readonly assetVersions: AssetVersionProvider,
        private readonly gameplayEvents: GameplayEventSink = NOOP_GAMEPLAY_EVENT_SINK,
        private readonly mailArrival?: MailArrivalReader,
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

        const snapshot = this.players.loadForAccount(zatSession.accountId);
        this.gameplayEvents.publish({ type: "player.login", playerId: snapshot.player.id });
        return {
            viewerId,
            availableAssetVersion: this.assetVersions.getAvailableAssetVersion(),
            snapshot,
            mailArrived: this.mailArrival?.hasArrivedForPlayer(snapshot.player.id) ?? false,
        };
    }
}
