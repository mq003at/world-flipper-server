import { readFileSync } from "node:fs";
import path from "node:path";
import { InvariantError } from "../../shared/errors/application-error";

export interface GachaRotationConfig {
    epoch: string;
    timezoneOffsetMinutes: number;
    seasonMonths: number;
    cycleDays: number;
    sourceCutoffAt: string;
    seed: string;
    excludedGachaIds: number[];
    shells: { new: number; rerun: number; weapon: number };
    featuredCountWeights: readonly [number, number, number, number, number];
    rerunCooldownCycles: number;
    weaponCooldownCycles: number;
    bannerLifetimeDays: number;
    freeCampaignId: number;
    dailyResetHourUtc: number;
}

export function loadGachaRotationConfig(liveContentDir: string): GachaRotationConfig {
    const filePath = path.join(liveContentDir, "gacha-rotation.json");
    const config = JSON.parse(readFileSync(filePath, "utf8")) as GachaRotationConfig;

    if (Number.isNaN(new Date(config.epoch).getTime())) {
        throw new InvariantError("Invalid gacha rotation epoch.");
    }
    if (Number.isNaN(new Date(config.sourceCutoffAt).getTime())) {
        throw new InvariantError("Invalid gacha rotation sourceCutoffAt.");
    }
    if (!Number.isInteger(config.timezoneOffsetMinutes)) {
        throw new InvariantError("Gacha rotation timezoneOffsetMinutes must be an integer.");
    }
    if (
        !Number.isInteger(config.seasonMonths)
        || config.seasonMonths <= 0
        || 12 % config.seasonMonths !== 0
    ) {
        throw new InvariantError("Gacha rotation seasonMonths must divide one calendar year.");
    }
    for (const [slot, id] of Object.entries(config.shells ?? {})) {
        if (!Number.isSafeInteger(id)) throw new InvariantError(`Invalid ${slot} shell gacha id.`);
    }
    if (!Array.isArray(config.featuredCountWeights) || config.featuredCountWeights.length !== 5) {
        throw new InvariantError("Gacha rotation featuredCountWeights must have five entries.");
    }
    if (!Number.isInteger(config.bannerLifetimeDays) || config.bannerLifetimeDays <= 0) {
        throw new InvariantError("Gacha rotation bannerLifetimeDays must be positive.");
    }
    if (!Number.isInteger(config.dailyResetHourUtc) || config.dailyResetHourUtc < 0 || config.dailyResetHourUtc > 23) {
        throw new InvariantError("Gacha rotation dailyResetHourUtc must be between 0 and 23.");
    }
    if (!Number.isInteger(config.cycleDays) || config.cycleDays <= 0) {
        throw new InvariantError("Gacha rotation cycleDays must be a positive integer.");
    }
    if (typeof config.seed !== "string" || config.seed.trim().length === 0) {
        throw new InvariantError("Gacha rotation seed must not be empty.");
    }
    if (
        !Array.isArray(config.excludedGachaIds)
        || config.excludedGachaIds.some((id) => !Number.isSafeInteger(id))
    ) {
        throw new InvariantError("Gacha rotation excludedGachaIds must contain integers.");
    }

    return config;
}
