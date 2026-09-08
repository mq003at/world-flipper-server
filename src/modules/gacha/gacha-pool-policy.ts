import { type GachaDefinition, type GachaPoolItem } from "../../content/master-data/gacha-catalog";
import { InvariantError } from "../../shared/errors/application-error";

export type GachaProbabilityProfile = "meteor-festival" | "featured" | "normal";

export interface GachaPoolSelection {
    id: number;
    rank: 5 | 4 | 3;
    featured: boolean;
}

const NORMAL_RANK_WEIGHTS = [500, 2500, 7000] as const;
const METEOR_FESTIVAL_RANK_WEIGHTS = [750, 2500, 6750] as const;

const RANKS = [5, 4, 3] as const;

export function gachaProbabilityProfile(
    festival: boolean,
    selections: readonly Pick<GachaPoolSelection, "featured">[],
): GachaProbabilityProfile {
    if (festival) return "meteor-festival";
    return selections.some((entry) => entry.featured) ? "featured" : "normal";
}

export function rankWeightsForProfile(
    profile: GachaProbabilityProfile,
): readonly [number, number, number] {
    return profile === "meteor-festival"
        ? METEOR_FESTIVAL_RANK_WEIGHTS
        : NORMAL_RANK_WEIGHTS;
}

export function rankRatePercent(
    profile: GachaProbabilityProfile,
    rank: 5 | 4 | 3,
): number {
    const index = RANKS.indexOf(rank);
    return rankWeightsForProfile(profile)[index] / 100;
}

/**
 * Starpoint keeps the game's common rate-up conventions while allowing an arbitrary
 * number of featured units. 5★ pickup rates match the existing seasonal rotation:
 * 1 => 1.5%, 2 => 1.0% each, 3 => 0.7% each, then a 2% pickup budget is shared.
 * 4★/3★ use the common master-data pickup weights and become proportional once the
 * featured set grows beyond those captured cases.
 */
export function featuredRatePerItemPercent(
    rank: 5 | 4 | 3,
    featuredCount: number,
    rankTotalPercent: number,
): number {
    if (featuredCount <= 0) return 0;

    if (rank === 5) {
        if (featuredCount === 1) return 1.5;
        if (featuredCount === 2) return 1.0;
        if (featuredCount === 3) return 0.7;
        return 2 / featuredCount;
    }

    if (rank === 4) {
        if (featuredCount === 1) return 2.5;
        if (featuredCount === 2) return 2.0;
        if (featuredCount === 3) return 1.7;
        return 10 / featuredCount;
    }

    if (featuredCount === 1) return 3.5;
    if (featuredCount === 2) return 3.0;
    return (rankTotalPercent * 0.4) / featuredCount;
}

export function calculateRankItemRates(
    rank: 5 | 4 | 3,
    rankTotalPercent: number,
    selections: readonly GachaPoolSelection[],
): Map<number, number> {
    if (selections.length === 0) {
        throw new InvariantError(`Runtime gacha pool has no rank ${rank} content.`);
    }

    const featured = selections.filter((entry) => entry.featured);
    const normal = selections.filter((entry) => !entry.featured);
    const result = new Map<number, number>();

    // If every item is marked featured there is no off-banner pool to receive the
    // remainder, so the rank is distributed evenly instead of silently dropping rate.
    if (featured.length === 0 || normal.length === 0) {
        const each = rankTotalPercent / selections.length;
        for (const entry of selections) result.set(entry.id, each);
        return result;
    }

    const requestedFeaturedEach = featuredRatePerItemPercent(
        rank,
        featured.length,
        rankTotalPercent,
    );
    // Leave a positive budget for normal entries even with pathological admin input.
    const maximumFeaturedTotal = rankTotalPercent * 0.95;
    const featuredTotal = Math.min(
        requestedFeaturedEach * featured.length,
        maximumFeaturedTotal,
    );
    const featuredEach = featuredTotal / featured.length;
    const normalEach = (rankTotalPercent - featuredTotal) / normal.length;

    for (const entry of featured) result.set(entry.id, featuredEach);
    for (const entry of normal) result.set(entry.id, normalEach);
    return result;
}

export function applyGachaPoolPolicy(
    current: GachaDefinition,
    selections: readonly GachaPoolSelection[],
    festival: boolean,
    configuredRankRatesPercent?: readonly [number, number, number],
): GachaDefinition {
    const seen = new Set<number>();
    for (const entry of selections) {
        if (seen.has(entry.id)) throw new InvariantError(`Duplicate gacha pool item ${entry.id}.`);
        seen.add(entry.id);
    }

    const profile = gachaProbabilityProfile(festival, selections);
    const rankWeights = configuredRankRatesPercent
        ? configuredRankRatesPercent.map((rate) => Math.round(rate * 100)) as [number, number, number]
        : rankWeightsForProfile(profile);
    const pool: Record<number, GachaPoolItem[]> = { 1: [], 2: [], 3: [] };

    for (let index = 0; index < RANKS.length; index += 1) {
        const rank = RANKS[index];
        const rankSelections = selections.filter((entry) => entry.rank === rank);
        const rates = calculateRankItemRates(rank, rankWeights[index] / 100, rankSelections);
        const poolKey = index + 1;
        pool[poolKey] = rankSelections.map((entry) => {
            const ratePercent = rates.get(entry.id) ?? 0;
            return {
                id: entry.id,
                rank,
                isRateUp: entry.featured,
                // `odds` is retained for client/master compatibility; runtime draws use weight.
                odds: Math.round(ratePercent * 100_000) / 1_000,
                weight: Math.max(1, Math.round(ratePercent * 1_000_000)),
            };
        });
    }

    return {
        ...current,
        pool,
        rankWeights,
    };
}
