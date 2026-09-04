import { InvalidRequestError } from "../../../shared/errors/application-error";

export interface GetActiveEventsRequest {
    viewerId: number;
}

export function parseGetActiveEvents(value: unknown): GetActiveEventsRequest {
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new InvalidRequestError();
    const viewerId = (value as Record<string, unknown>).viewer_id;
    if (typeof viewerId !== "number" || !Number.isFinite(viewerId)) throw new InvalidRequestError();
    return { viewerId };
}
