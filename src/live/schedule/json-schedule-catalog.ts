import { readFileSync } from "node:fs";
import path from "node:path";
import type { SourceScheduleEntry } from "./schedule.models";
import type { ScheduleCatalog } from "./schedule.catalog";

export class JsonScheduleCatalog implements ScheduleCatalog {
    private readonly entries: SourceScheduleEntry[];

    constructor(liveContentDir: string) {
        this.entries = JSON.parse(
            readFileSync(path.join(liveContentDir, "schedule.json"), "utf8"),
        ) as SourceScheduleEntry[];
    }

    list(): readonly SourceScheduleEntry[] {
        return this.entries;
    }
}
