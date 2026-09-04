import { readFileSync } from "node:fs";
import path from "node:path";
import { InvariantError } from "../../../shared/errors/application-error";
import type { EventCatalog } from "./event.catalog";
import type {
    EventDefinition,
    EventQuestRange,
    EventShopBinding,
    LiveEventKind,
} from "./event.models";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown, label: string): JsonRecord {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new InvariantError(`Invalid ${label}.`);
    }
    return value as JsonRecord;
}

function asString(value: unknown, label: string): string {
    if (typeof value !== "string" || value.length === 0) throw new InvariantError(`Invalid ${label}.`);
    return value;
}

function asNumber(value: unknown, label: string): number {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new InvariantError(`Invalid ${label}.`);
    return value;
}

function parseQuestRange(value: unknown): EventQuestRange {
    const row = asRecord(value, "event quest range");
    const minQuestId = asNumber(row.minQuestId, "event min quest id");
    const maxQuestId = asNumber(row.maxQuestId, "event max quest id");
    if (maxQuestId < minQuestId) throw new InvariantError("Event quest range is inverted.");
    return {
        category: asNumber(row.category, "event quest category"),
        minQuestId,
        maxQuestId,
    };
}

function parseShopBinding(value: unknown): EventShopBinding {
    const row = asRecord(value, "event shop binding");
    return {
        eventType: asNumber(row.eventType, "event shop type"),
        eventId: asNumber(row.eventId, "event shop id"),
    };
}

function parseNumberArray(value: unknown, label: string): number[] {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new InvariantError(`Invalid ${label}.`);
    return value.map((entry) => asNumber(entry, label));
}

function parseDefinition(value: unknown): EventDefinition {
    const row = asRecord(value, "event definition");
    const kind = row.kind as LiveEventKind;
    if (kind !== "story" && kind !== "world-story" && kind !== "simple" && kind !== "rush" && kind !== "ranking" && kind !== "raid") {
        throw new InvariantError("Invalid event kind.");
    }
    const questRanges = row.questRanges === undefined
        ? []
        : Array.isArray(row.questRanges)
            ? row.questRanges.map(parseQuestRange)
            : (() => { throw new InvariantError("Invalid event quest ranges."); })();
    const shopBindings = row.shopBindings === undefined
        ? []
        : Array.isArray(row.shopBindings)
            ? row.shopBindings.map(parseShopBinding)
            : (() => { throw new InvariantError("Invalid event shop bindings."); })();
    return {
        id: asString(row.id, "event id"),
        kind,
        eventId: asNumber(row.eventId, "event numeric id"),
        scheduleId: asString(row.scheduleId, "event schedule id"),
        questRanges,
        shopBindings,
        boxGachaIds: parseNumberArray(row.boxGachaIds, "event box gacha ids"),
    };
}

export class JsonEventCatalog implements EventCatalog {
    private readonly definitions: EventDefinition[];

    constructor(liveContentDir: string) {
        let raw: unknown;
        try {
            raw = JSON.parse(readFileSync(path.join(liveContentDir, "events.json"), "utf8"));
        } catch (error) {
            throw new InvariantError(`Unable to load event definitions: ${String(error)}`);
        }
        if (!Array.isArray(raw)) throw new InvariantError("Event definitions must be an array.");
        this.definitions = raw.map(parseDefinition);
    }

    list(): readonly EventDefinition[] {
        return this.definitions;
    }
}
