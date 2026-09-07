import type { Clock } from "./clock";

/** A wall clock whose offset can be changed by the local administration UI. */
export class AdjustableSystemClock implements Clock {
    private offsetMs = 0;

    now(): Date {
        return new Date(Date.now() + this.offsetMs);
    }

    set(instant: Date): void {
        if (Number.isNaN(instant.getTime())) throw new Error("Invalid server time.");
        this.offsetMs = instant.getTime() - Date.now();
    }

    reset(): void {
        this.offsetMs = 0;
    }
}
