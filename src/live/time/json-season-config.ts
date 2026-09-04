import { readFileSync } from "node:fs";
import path from "node:path";
import { InvariantError } from "../../shared/errors/application-error";
import type { SeasonConfig } from "./season.models";

export function loadSeasonConfig(
    liveContentDir: string,
    seasonStartOverride?: string,
): SeasonConfig {
    const filePath = path.join(liveContentDir, "season.json");
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as SeasonConfig;
    const config: SeasonConfig = {
        ...raw,
        ...(seasonStartOverride?.trim()
            ? { seasonStartsAt: seasonStartOverride.trim() }
            : {}),
    };

    const dates = [config.seasonStartsAt, config.sourceStartsAt, config.sourceEndsAt].map(
        (value) => new Date(value),
    );
    if (dates.some((value) => Number.isNaN(value.getTime()))) {
        throw new InvariantError("Invalid live-service season timestamp.");
    }
    if (!Number.isFinite(config.durationDays) || config.durationDays <= 0) {
        throw new InvariantError("Season durationDays must be positive.");
    }
    if (config.dailyResetHourUtc < 0 || config.dailyResetHourUtc > 23) {
        throw new InvariantError("dailyResetHourUtc must be between 0 and 23.");
    }
    if (config.weekStartsOnUtcDay < 0 || config.weekStartsOnUtcDay > 6) {
        throw new InvariantError("weekStartsOnUtcDay must be between 0 and 6.");
    }
    return config;
}
