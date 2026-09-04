import type { SourceScheduleEntry } from "./schedule.models";

export interface ScheduleCatalog {
    list(): readonly SourceScheduleEntry[];
}
