import { InvalidRequestError } from "../../shared/errors/application-error";

export interface ExecuteGachaRequest {
    apiCount: number;
    paymentType: number;
    numberOfExec: number;
    viewerId: number;
    gachaId: number;
    type: number;
}

export interface ExchangeCharacterRequest {
    characterId: number;
    apiCount: number;
    gachaId: number;
    viewerId: number;
}

export interface ExchangeEquipmentRequest {
    equipmentId: number;
    apiCount: number;
    gachaId: number;
    viewerId: number;
}

export interface BaseSelectorRequest { viewerId: number; characterId: number; }

function asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new InvalidRequestError();
    }
    return value as Record<string, unknown>;
}

function numberField(body: Record<string, unknown>, key: string): number {
    const value = body[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new InvalidRequestError();
    }
    return value;
}

function optionalNumberField(body: Record<string, unknown>, key: string, fallback = 0): number {
    const value = body[key];
    if (value === undefined) return fallback;
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new InvalidRequestError();
    }
    return value;
}

export function parseExecuteGachaRequest(value: unknown): ExecuteGachaRequest {
    const body = asRecord(value);
    return {
        apiCount: optionalNumberField(body, "api_count"),
        paymentType: numberField(body, "payment_type"),
        numberOfExec: numberField(body, "number_of_exec"),
        viewerId: numberField(body, "viewer_id"),
        gachaId: numberField(body, "gacha_id"),
        type: numberField(body, "type"),
    };
}

export function parseExchangeCharacterRequest(value: unknown): ExchangeCharacterRequest {
    const body = asRecord(value);
    return {
        characterId: numberField(body, "character_id"),
        apiCount: optionalNumberField(body, "api_count"),
        gachaId: numberField(body, "gacha_id"),
        viewerId: numberField(body, "viewer_id"),
    };
}

export function parseExchangeEquipmentRequest(value: unknown): ExchangeEquipmentRequest {
    const body = asRecord(value);
    return {
        equipmentId: numberField(body, "equipment_id"),
        apiCount: optionalNumberField(body, "api_count"),
        gachaId: numberField(body, "gacha_id"),
        viewerId: numberField(body, "viewer_id"),
    };
}

export function parseBaseSelectorRequest(value: unknown): BaseSelectorRequest {
    const body = asRecord(value);
    return { viewerId: numberField(body, "viewer_id"), characterId: numberField(body, "character_id") };
}
