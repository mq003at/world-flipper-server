import { InvalidRequestError } from "../../shared/errors/application-error";

export interface UpdateTutorialStepRequest {
    viewerId: number;
    completedStep: number;
    skip: boolean;
    name?: string;
    gachaId?: number;
}

export interface FinishTutorialTriggerRequest {
    viewerId: number;
    tutorialIds: number[];
}

function asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new InvalidRequestError();
    }
    return value as Record<string, unknown>;
}

function requiredFiniteNumber(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new InvalidRequestError();
    }
    return value;
}

export function parseUpdateTutorialStepRequest(body: unknown): UpdateTutorialStepRequest {
    const input = asRecord(body);
    const viewerId = requiredFiniteNumber(input.viewer_id);
    const completedStep = requiredFiniteNumber(input.step);

    if (viewerId <= 0) throw new InvalidRequestError();

    const skip = input.skip === undefined ? false : input.skip;
    if (typeof skip !== "boolean") throw new InvalidRequestError();

    const name = input.name;
    if (name !== undefined && typeof name !== "string") throw new InvalidRequestError();

    const rawGachaId = input.gacha_id;
    const gachaId = rawGachaId === undefined ? undefined : requiredFiniteNumber(rawGachaId);

    return {
        viewerId,
        completedStep,
        skip,
        ...(name === undefined ? {} : { name }),
        ...(gachaId === undefined ? {} : { gachaId }),
    };
}

export function parseFinishTutorialTriggerRequest(body: unknown): FinishTutorialTriggerRequest {
    const input = asRecord(body);
    const viewerId = requiredFiniteNumber(input.viewer_id);
    if (viewerId <= 0) throw new InvalidRequestError();

    if (!Array.isArray(input.tutorial_ids)) throw new InvalidRequestError();
    const tutorialIds = input.tutorial_ids.map((value) => requiredFiniteNumber(value));

    return { viewerId, tutorialIds };
}
