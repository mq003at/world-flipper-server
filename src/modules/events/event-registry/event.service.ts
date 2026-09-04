import type { Clock } from "../../../infrastructure/clock/clock";
import type { GameplayEvent } from "../../../live/gameplay-events/gameplay-event";
import type { IdentityService } from "../../identity/identity.service";
import type { PlayerService } from "../../player/player.service";
import type { ActiveEventView, PlayerEventState } from "./event.models";
import type { EventRepository } from "./event.repository";
import type { EventRegistry } from "./event.registry";

export interface PlayerActiveEventView extends ActiveEventView {
    state: PlayerEventState;
}

export class EventService {
    constructor(
        private readonly identityService: IdentityService,
        private readonly playerService: PlayerService,
        private readonly repository: EventRepository,
        private readonly registry: EventRegistry,
        private readonly clock: Clock,
    ) {}

    listActive(viewerId: number): PlayerActiveEventView[] {
        const player = this.requirePlayer(viewerId);
        return this.touchActive(player.id, this.clock.now());
    }

    handleGameplayEvent(event: GameplayEvent): void {
        if (event.type !== "player.login") return;
        this.touchActive(event.playerId, this.clock.now());
    }

    private touchActive(playerId: number, now: Date): PlayerActiveEventView[] {
        const active = this.registry.listActive(now);
        return this.repository.transaction(() => active.map((entry) => {
            const existing = this.repository.get(playerId, entry.definition.id);
            const state: PlayerEventState = existing
                ? { ...existing, lastSeenAt: now }
                : {
                      playerId,
                      eventKey: entry.definition.id,
                      joinedAt: now,
                      lastSeenAt: now,
                      completedAt: null,
                      payload: {},
                  };
            this.repository.upsert(state);
            return { ...entry, state };
        }));
    }

    private requirePlayer(viewerId: number): { id: number } {
        const viewer = this.identityService.requireViewerSession(viewerId);
        return this.playerService.requireForAccount(viewer.accountId);
    }
}
