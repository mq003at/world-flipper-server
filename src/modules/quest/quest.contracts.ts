import { InvalidRequestError } from "../../shared/errors/application-error";
import { QuestCategory } from "../../content/master-data/quest-catalog";
import type { PartyStatistics } from "./quest.models";

export interface StartQuestRequest {
    questId: number;
    useBossBoostPoint: boolean;
    useBoostPoint: boolean;
    category: QuestCategory;
    viewerId: number;
    playId: string;
    isAutoStartMode: boolean;
    partyId: number;
}

export interface FinishQuestRequest {
    elapsedTimeMs: number;
    score: number;
    viewerId: number;
    addMana: number;
    isAccomplished: boolean;
    statistics: PartyStatistics;
}

export interface ViewerQuestRequest {
    viewerId: number;
    category: QuestCategory;
}

export interface StoryFinishRequest {
    questId: number;
    viewerId: number;
    category: QuestCategory;
}

function asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new InvalidRequestError();
    }
    return value as Record<string, unknown>;
}

function numberField(body: Record<string, unknown>, key: string): number {
    const value = body[key];
    if (typeof value !== "number" || !Number.isFinite(value)) throw new InvalidRequestError();
    return value;
}

function booleanField(body: Record<string, unknown>, key: string): boolean {
    const value = body[key];
    if (typeof value !== "boolean") throw new InvalidRequestError();
    return value;
}

function optionalStringField(body: Record<string, unknown>, key: string): string {
    const value = body[key];
    return typeof value === "string" ? value : "";
}

function idsFromPartyArray(value: unknown): Array<number | null> {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => {
        if (entry === null || typeof entry !== "object" || Array.isArray(entry)) return null;
        const id = (entry as Record<string, unknown>).id;
        return typeof id === "number" && Number.isFinite(id) ? id : null;
    });
}

function numberOrNullArray(value: unknown): Array<number | null> {
    if (!Array.isArray(value)) return [];
    return value.map((entry) =>
        typeof entry === "number" && Number.isFinite(entry) ? entry : null,
    );
}

function parseStatistics(value: unknown): PartyStatistics {
    const statistics = asRecord(value);
    const party = asRecord(statistics.party);
    return {
        characters: idsFromPartyArray(party.characters),
        unisonCharacters: idsFromPartyArray(party.unison_characters),
        equipmentIds: idsFromPartyArray(party.equipments),
        abilitySoulIds: numberOrNullArray(party.ability_soul_ids),
    };
}

export function parseStartQuestRequest(value: unknown): StartQuestRequest {
    const body = asRecord(value);
    return {
        questId: numberField(body, "quest_id"),
        useBossBoostPoint: booleanField(body, "use_boss_boost_point"),
        useBoostPoint: booleanField(body, "use_boost_point"),
        category: numberField(body, "category") as QuestCategory,
        viewerId: numberField(body, "viewer_id"),
        playId: optionalStringField(body, "play_id"),
        isAutoStartMode: booleanField(body, "is_auto_start_mode"),
        partyId: numberField(body, "party_id"),
    };
}

export function parseFinishQuestRequest(value: unknown): FinishQuestRequest {
    const body = asRecord(value);
    return {
        elapsedTimeMs: numberField(body, "elapsed_time_ms"),
        score: numberField(body, "score"),
        viewerId: numberField(body, "viewer_id"),
        addMana: numberField(body, "add_mana"),
        isAccomplished: booleanField(body, "is_accomplished"),
        statistics: parseStatistics(body.statistics),
    };
}

export function parseViewerQuestRequest(value: unknown): ViewerQuestRequest {
    const body = asRecord(value);
    return {
        viewerId: numberField(body, "viewer_id"),
        category: numberField(body, "category") as QuestCategory,
    };
}

export function parseStoryFinishRequest(value: unknown): StoryFinishRequest {
    const body = asRecord(value);
    return {
        questId: numberField(body, "quest_id"),
        viewerId: numberField(body, "viewer_id"),
        category: numberField(body, "category") as QuestCategory,
    };
}
