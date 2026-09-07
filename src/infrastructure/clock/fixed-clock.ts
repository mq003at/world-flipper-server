import type { Clock } from "./clock";

/** A client-facing clock used to keep frozen master-data windows visible. */
export class FixedClock implements Clock {
    constructor(private readonly instant: Date) {}

    now(): Date {
        return new Date(this.instant);
    }
}
