import { InvalidRequestError } from "../../shared/errors/application-error";

function object(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new InvalidRequestError("Invalid request body.");
    }
    return value as Record<string, unknown>;
}

function numberField(body: Record<string, unknown>, key: string): number {
    const value = Number(body[key]);
    if (!Number.isSafeInteger(value)) throw new InvalidRequestError("Invalid request body.");
    return value;
}

export function parseGetMissionProgress(body: unknown): { viewerId: number; categories: number[] } {
    const raw = object(body);
    const categoryList = Array.isArray(raw.category_list) ? raw.category_list : [];
    return {
        viewerId: numberField(raw, "viewer_id"),
        categories: categoryList.flatMap((entry) => {
            if (typeof entry !== "object" || entry === null) return [];
            const value = Number((entry as Record<string, unknown>).category);
            return Number.isSafeInteger(value) ? [value] : [];
        }),
    };
}

export function parseUpdateMissionProgress(body: unknown): { viewerId: number } {
    const raw = object(body);
    return { viewerId: numberField(raw, "viewer_id") };
}

export function parseClaimMission(body: unknown): { viewerId: number; missionId: number } {
    const raw = object(body);
    return { viewerId: numberField(raw, "viewer_id"), missionId: numberField(raw, "mission_id") };
}
