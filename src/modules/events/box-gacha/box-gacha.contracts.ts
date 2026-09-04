import { InvalidRequestError } from "../../../shared/errors/application-error";

export interface GetBoxListRequest {
    boxGachaId: number;
    viewerId: number;
    apiCount: number;
}

export interface ExecBoxGachaRequest {
    stopOnFeaturedRewards: boolean;
    boxGachaId: number;
    boxId: number;
    apiCount: number;
    viewerId: number;
    number: number;
}

export interface CloseBoxRequest {
    boxGachaId: number;
    boxId: number;
    viewerId: number;
    apiCount: number;
}

function asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new InvalidRequestError();
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

export function parseGetBoxList(value: unknown): GetBoxListRequest {
    const body = asRecord(value);
    return {
        boxGachaId: numberField(body, "box_gacha_id"),
        viewerId: numberField(body, "viewer_id"),
        apiCount: typeof body.api_count === "number" ? body.api_count : 0,
    };
}

export function parseExecBoxGacha(value: unknown): ExecBoxGachaRequest {
    const body = asRecord(value);
    return {
        stopOnFeaturedRewards: booleanField(body, "stop_on_featured_rewards"),
        boxGachaId: numberField(body, "box_gacha_id"),
        boxId: numberField(body, "box_id"),
        apiCount: typeof body.api_count === "number" ? body.api_count : 0,
        viewerId: numberField(body, "viewer_id"),
        number: numberField(body, "number"),
    };
}

export function parseCloseBox(value: unknown): CloseBoxRequest {
    const body = asRecord(value);
    return {
        boxGachaId: numberField(body, "box_gacha_id"),
        boxId: numberField(body, "box_id"),
        viewerId: numberField(body, "viewer_id"),
        apiCount: typeof body.api_count === "number" ? body.api_count : 0,
    };
}
