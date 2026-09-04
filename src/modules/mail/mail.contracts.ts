import { InvalidRequestError } from "../../shared/errors/application-error";

export interface MailIndexRequest {
    viewerId: number;
    currentPage: number;
}

export interface MailClaimRequest {
    viewerId: number;
    mailId: number;
}

export interface MailClaimAllRequest {
    viewerId: number;
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

export function parseMailIndex(value: unknown): MailIndexRequest {
    const body = asRecord(value);
    return {
        viewerId: numberField(body, "viewer_id"),
        currentPage: typeof body.current_page === "number" ? body.current_page : 1,
    };
}

export function parseMailClaim(value: unknown): MailClaimRequest {
    const body = asRecord(value);
    return { viewerId: numberField(body, "viewer_id"), mailId: numberField(body, "mail_id") };
}

export function parseMailClaimAll(value: unknown): MailClaimAllRequest {
    const body = asRecord(value);
    return { viewerId: numberField(body, "viewer_id") };
}
