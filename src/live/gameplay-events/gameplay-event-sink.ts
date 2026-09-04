import type { GameplayEvent } from "./gameplay-event";

export interface GameplayEventSink {
    publish(event: GameplayEvent): void;
}

export const NOOP_GAMEPLAY_EVENT_SINK: GameplayEventSink = {
    publish(): void {},
};
