import { readFileSync } from "node:fs";
import path from "node:path";
import { InvariantError } from "../../shared/errors/application-error";
import { RewardType, type Reward } from "../reward/reward.models";
import type { MailCatalog } from "./mail.catalog";
import type { MailDefinition, MailDeliveryWindow, MailRewardPolicy } from "./mail.models";

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

function asOptionalString(value: unknown, label: string): string | undefined {
    if (value === undefined) return undefined;
    return asString(value, label);
}

function asOptionalPositiveNumber(value: unknown, label: string): number | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new InvariantError(`Invalid ${label}.`);
    }
    return value;
}

function parseReward(value: unknown): Reward {
    const row = asRecord(value, "mail reward");
    const type = row.type;
    if (typeof type !== "number" || !Number.isInteger(type)) {
        throw new InvariantError("Invalid mail reward type.");
    }
    const count = row.count;
    const id = row.id;
    switch (type) {
        case RewardType.ITEM:
        case RewardType.EQUIPMENT:
            if (typeof id !== "number" || !Number.isSafeInteger(id)) {
                throw new InvariantError("Mail reward id is required.");
            }
            if (typeof count !== "number" || !Number.isSafeInteger(count) || count <= 0) {
                throw new InvariantError("Mail reward count must be positive.");
            }
            return { type, id, count };
        case RewardType.CHARACTER:
            if (typeof id !== "number" || !Number.isSafeInteger(id)) {
                throw new InvariantError("Mail character reward id is required.");
            }
            return { type: RewardType.CHARACTER, id };
        case RewardType.BEADS:
        case RewardType.MANA:
        case RewardType.EXP:
            if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
                throw new InvariantError("Mail currency reward count must be non-negative.");
            }
            return { type, count };
        default:
            throw new InvariantError(`Unsupported mail reward type ${String(type)}.`);
    }
}

function parseDefinition(value: unknown): MailDefinition {
    const row = asRecord(value, "mail definition");
    if (!Array.isArray(row.rewards)) throw new InvariantError("Mail rewards must be an array.");
    const rewardPolicy = (row.rewardPolicy ?? "content-bound") as MailRewardPolicy;
    if (rewardPolicy !== "content-bound" && rewardPolicy !== "time-gated") {
        throw new InvariantError("Invalid mail reward policy.");
    }
    const deliveryWindow = (row.deliveryWindow ?? "active") as MailDeliveryWindow;
    if (deliveryWindow !== "active" && deliveryWindow !== "after-release") {
        throw new InvariantError("Invalid mail delivery window.");
    }
    const id = asString(row.id, "mail id");
    return {
        id,
        sourceKey: typeof row.sourceKey === "string" && row.sourceKey.length > 0 ? row.sourceKey : id,
        title: asString(row.title, "mail title"),
        body: typeof row.body === "string" ? row.body : "",
        rewards: row.rewards.map(parseReward),
        rewardPolicy,
        deliveryWindow,
        scheduleId: asOptionalString(row.scheduleId, "mail schedule id"),
        expiresAfterHours: asOptionalPositiveNumber(row.expiresAfterHours, "mail expiry hours"),
    };
}

export class JsonMailCatalog implements MailCatalog {
    private readonly definitions: MailDefinition[];

    constructor(liveContentDir: string) {
        const file = path.join(liveContentDir, "mail.json");
        let raw: unknown;
        try {
            raw = JSON.parse(readFileSync(file, "utf8"));
        } catch (error) {
            throw new InvariantError(`Unable to load live mail definitions: ${String(error)}`);
        }
        if (!Array.isArray(raw)) throw new InvariantError("Mail definitions must be an array.");
        this.definitions = raw.map(parseDefinition);
    }

    list(): readonly MailDefinition[] {
        return this.definitions;
    }
}
