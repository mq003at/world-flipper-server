import type { GameplayEvent } from "./gameplay-event";
import type { GameplayEventSink } from "./gameplay-event-sink";

export type GameplayEventHandler = (event: GameplayEvent) => void;

export class InProcessGameplayEventBus implements GameplayEventSink {
    private readonly handlers: GameplayEventHandler[] = [];

    subscribe(handler: GameplayEventHandler): void {
        this.handlers.push(handler);
    }

    publish(event: GameplayEvent): void {
        for (const handler of this.handlers) {
            try {
                handler(event);
            } catch (error) {
                // Gameplay commits before live-service projections. A broken mission projection
                // must never turn a successful gacha/quest/shop transaction into a client-visible
                // failure that can be retried and duplicated.
                console.error("Gameplay event handler failed", event.type, error);
            }
        }
    }
}
