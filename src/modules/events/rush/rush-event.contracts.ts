import { InvalidRequestError } from "../../../shared/errors/application-error";

function record(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new InvalidRequestError();
    return value as Record<string, unknown>;
}
function num(body: Record<string, unknown>, key: string): number {
    const value = body[key];
    if (typeof value !== "number" || !Number.isFinite(value)) throw new InvalidRequestError();
    return value;
}
function bool(body: Record<string, unknown>, key: string): boolean {
    const value = body[key];
    if (typeof value !== "boolean") throw new InvalidRequestError();
    return value;
}

export function parseRushSummary(value: unknown) {
    const body = record(value); return { viewerId: num(body,"viewer_id"), eventId: num(body,"event_id") };
}
export function parseRushParty(value: unknown) {
    const body = record(value); return { viewerId: num(body,"viewer_id") };
}
export function parseRushSelectFolder(value: unknown) {
    const body = record(value); return { viewerId:num(body,"viewer_id"), eventId:num(body,"event_id"), folderId:num(body,"folder_id") };
}
export function parseRushRanking(value: unknown) {
    const body=record(value); const page=body.page;
    return { viewerId:num(body,"viewer_id"), eventId:num(body,"event_id"), page: typeof page === "number" ? Math.trunc(page) : 0 };
}
export function parseRushRankingPlayedParty(value: unknown) {
    const body=record(value); return { viewerId:num(body,"viewer_id"), eventId:num(body,"event_id"), rankNumber:num(body,"rank_number") };
}
export function parseRushBattleStart(value: unknown) {
    const body=record(value); return {
        viewerId:num(body,"viewer_id"), questId:num(body,"quest_id"), partyId:num(body,"party_id"),
        playId: typeof body.play_id === "string" ? body.play_id : "", isAutoStartMode:bool(body,"is_auto_start_mode"),
    };
}
export function parseRushReset(value: unknown) {
    const body=record(value); return {
        viewerId:num(body,"viewer_id"), eventId:num(body,"event_id"), questType:num(body,"quest_type"),
        resetTargetId: typeof body.reset_target_id === "number" ? body.reset_target_id : undefined,
        isResetAfterTargetRound: typeof body.is_reset_after_target_round === "boolean" ? body.is_reset_after_target_round : undefined,
    };
}
