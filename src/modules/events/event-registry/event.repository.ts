import type { PlayerEventState } from "./event.models";

export interface EventRepository {
    get(playerId: number, eventKey: string): PlayerEventState | null;
    upsert(state: PlayerEventState): void;
    transaction<T>(work: () => T): T;
}
