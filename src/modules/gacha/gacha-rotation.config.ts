import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { InvariantError } from "../../shared/errors/application-error";

export interface ManualSeasonalBannerConfig {
    id: string;
    shellGachaId: number;
    startAt: string;
    endAt: string;
    poolIds: number[];
    featuredRatesPercent: Record<string, number>;
    rankRatesPercent: { "5": number; "4": number; "3": number };
    multiGuaranteeMinimumRank?: 4 | 5;
}

export interface GachaRotationConfig {
    epoch: string;
    timezoneOffsetMinutes: number;
    seasonMonths: number;
    cycleDays: number;
    sourceCutoffAt: string;
    seed: string;
    excludedGachaIds: number[];
    shells: {
        base: number;
        new: number;
        rerun: number;
        elemental: number;
        weapon: number;
        meteor1: number;
        meteor2: number;
        anniversary: number;
    };
    /** Only these frozen client shells are advertised to the unpatched EoS client. */
    clientVisibleSlots: Array<"base" | "new" | "rerun" | "elemental" | "weapon" | "meteor-1" | "meteor-2" | "anniversary">;
    bannerLifetimeDays: number;
    freeCampaignId: number;
    dailyResetHourUtc: number;
    clientShellTime: string;
    baseSelectorPrice: number;
    ratePolicies: {
        normal: [number, number, number];
        meteorFestival: [number, number, number];
    };
    runOverrides: Record<string, { featuredIds?: number[]; poolIds?: number[] }>;
    manualSeasonalBanners: ManualSeasonalBannerConfig[];
}

export function loadGachaRotationConfig(liveContentDir: string): GachaRotationConfig {
    const filePath = path.join(liveContentDir, "gacha-rotation.json");
    const config = JSON.parse(readFileSync(filePath, "utf8")) as GachaRotationConfig;
    const overridesPath = path.join(liveContentDir, "gacha-rotation-overrides.json");
    const overrideFile = existsSync(overridesPath)
        ? JSON.parse(readFileSync(overridesPath, "utf8")) as { runs?: GachaRotationConfig["runOverrides"] }
        : {};
    config.runOverrides = overrideFile.runs ?? {};
    const manualPath = path.join(liveContentDir, "gacha-seasonal-banners.json");
    const manualFile = existsSync(manualPath)
        ? JSON.parse(readFileSync(manualPath, "utf8")) as { banners?: ManualSeasonalBannerConfig[] }
        : {};
    config.manualSeasonalBanners = manualFile.banners ?? [];

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
    if (!Number.isInteger(config.bannerLifetimeDays) || config.bannerLifetimeDays <= 0) {
        throw new InvariantError("Gacha rotation bannerLifetimeDays must be positive.");
    }
    if (!Number.isInteger(config.dailyResetHourUtc) || config.dailyResetHourUtc < 0 || config.dailyResetHourUtc > 23) {
        throw new InvariantError("Gacha rotation dailyResetHourUtc must be between 0 and 23.");
    }
    if (Number.isNaN(new Date(config.clientShellTime).getTime())) {
        throw new InvariantError("Invalid gacha rotation clientShellTime.");
    }
    if (!Number.isInteger(config.cycleDays) || config.cycleDays <= 0) {
        throw new InvariantError("Gacha rotation cycleDays must be a positive integer.");
    }
    if (typeof config.seed !== "string" || config.seed.trim().length === 0) {
        throw new InvariantError("Gacha rotation seed must not be empty.");
    }
    if (!Array.isArray(config.clientVisibleSlots)) {
        throw new InvariantError("Gacha rotation clientVisibleSlots must be an array.");
    }
    if (!Number.isSafeInteger(config.baseSelectorPrice) || config.baseSelectorPrice < 0) {
        throw new InvariantError("Gacha rotation baseSelectorPrice must be a non-negative integer.");
    }
    for (const [name, rates] of Object.entries(config.ratePolicies ?? {})) {
        if (!Array.isArray(rates) || rates.length !== 3 || rates.some((rate) => !Number.isFinite(rate) || rate <= 0)
            || Math.abs(rates.reduce((sum, rate) => sum + rate, 0) - 100) > 1e-8) {
            throw new InvariantError(`Gacha rotation ${name} rate policy must contain three positive percentages totaling 100.`);
        }
    }
    if (!config.ratePolicies?.normal || !config.ratePolicies?.meteorFestival) {
        throw new InvariantError("Gacha rotation normal and meteorFestival rate policies are required.");
    }
    for (const [key, override] of Object.entries(config.runOverrides)) {
        if (!/^\d+:\d+:[a-z0-9-]+$/.test(key)
            || override.featuredIds?.some((id) => !Number.isSafeInteger(id))
            || override.poolIds?.some((id) => !Number.isSafeInteger(id))) {
            throw new InvariantError(`Invalid gacha rotation override '${key}'.`);
        }
    }
    const manualIds = new Set<string>();
    for (const banner of config.manualSeasonalBanners) {
        const startsAt = new Date(banner.startAt);
        const endsAt = new Date(banner.endAt);
        const rankRates = [banner.rankRatesPercent?.["5"], banner.rankRatesPercent?.["4"], banner.rankRatesPercent?.["3"]];
        const rankTotal = rankRates.reduce((sum, rate) => sum + Number(rate ?? NaN), 0);
        if (typeof banner.id !== "string" || banner.id.trim() === "" || manualIds.has(banner.id)
            || !Number.isSafeInteger(banner.shellGachaId)
            || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt
            || !Array.isArray(banner.poolIds) || banner.poolIds.length === 0
            || banner.poolIds.some((id) => !Number.isSafeInteger(id)) || new Set(banner.poolIds).size !== banner.poolIds.length
            || rankRates.some((rate) => !Number.isFinite(rate) || Number(rate) <= 0)
            || Math.abs(rankTotal - 100) > 1e-8
            || Object.entries(banner.featuredRatesPercent ?? {}).some(([id, rate]) => !/^\d+$/.test(id) || !Number.isFinite(rate) || rate <= 0)
            || (banner.multiGuaranteeMinimumRank !== undefined && banner.multiGuaranteeMinimumRank !== 4 && banner.multiGuaranteeMinimumRank !== 5)) {
            throw new InvariantError(`Invalid manual Seasonal banner '${banner.id ?? "<unknown>"}'.`);
        }
        manualIds.add(banner.id);
    }
    if (
        !Array.isArray(config.excludedGachaIds)
        || config.excludedGachaIds.some((id) => !Number.isSafeInteger(id))
    ) {
        throw new InvariantError("Gacha rotation excludedGachaIds must contain integers.");
    }

    return config;
}
