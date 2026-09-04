import {
    GachaMovieType,
    GachaType,
    type GachaCatalog,
    type GachaDefinition,
    type GachaPoolItem,
} from "../../content/master-data/gacha-catalog";
import type { RandomSource } from "../../infrastructure/random/random-source";
import { InvariantError } from "../../shared/errors/application-error";
import type { CharacterDrawPresentation } from "./gacha.models";

const CHARACTER_NORMAL_RANK_WEIGHTS = [75, 250, 675] as const;
const CHARACTER_RATE_UP_RANK_WEIGHTS = [50, 250, 700] as const;
const EQUIPMENT_RANK_WEIGHTS = [50, 250, 700] as const;
const GUARANTEED_CHARACTER_NORMAL_RANK_WEIGHTS = [75, 925] as const;
const GUARANTEED_CHARACTER_RATE_UP_RANK_WEIGHTS = [50, 950] as const;
const GUARANTEED_EQUIPMENT_RANK_WEIGHTS = [50, 950] as const;

const MOVIE_WEIGHTS: readonly (readonly number[])[] = [
    [80, 20],
    [80, 20],
    [100],
];

function weightedIndex(random: RandomSource, weights: readonly number[]): number {
    if (weights.length === 0) throw new InvariantError("Cannot roll an empty weight table.");
    const normalized = weights.map((weight) => {
        if (!Number.isFinite(weight) || weight < 0) {
            throw new InvariantError("Invalid gacha weight.");
        }
        return Math.floor(weight);
    });
    const total = normalized.reduce((sum, weight) => sum + weight, 0);
    if (total <= 0) throw new InvariantError("Gacha weight table has no positive entries.");

    const roll = random.nextInt(0, total);
    let cumulative = 0;
    for (let index = 0; index < normalized.length; index += 1) {
        cumulative += normalized[index] ?? 0;
        if (roll < cumulative) return index;
    }
    return normalized.length - 1;
}

function isRateUpCharacterGacha(gacha: GachaDefinition): boolean {
    return gacha.type === GachaType.CHARACTER && gacha.movieName !== "normal";
}

function rankWeights(gacha: GachaDefinition, guaranteed: boolean): readonly number[] {
    if (gacha.type === GachaType.WEAPON) {
        return guaranteed ? GUARANTEED_EQUIPMENT_RANK_WEIGHTS : EQUIPMENT_RANK_WEIGHTS;
    }
    const rateUp = isRateUpCharacterGacha(gacha);
    if (guaranteed) {
        return rateUp
            ? GUARANTEED_CHARACTER_RATE_UP_RANK_WEIGHTS
            : GUARANTEED_CHARACTER_NORMAL_RANK_WEIGHTS;
    }
    return rateUp ? CHARACTER_RATE_UP_RANK_WEIGHTS : CHARACTER_NORMAL_RANK_WEIGHTS;
}

function choosePoolItem(random: RandomSource, pool: readonly GachaPoolItem[]): GachaPoolItem {
    if (pool.length === 0) throw new InvariantError("Selected gacha rank pool is empty.");
    return pool[weightedIndex(random, pool.map((item) => item.weight))] as GachaPoolItem;
}

export function drawGachaIds(
    random: RandomSource,
    gacha: GachaDefinition,
    drawCount: number,
): number[] {
    const result: number[] = [];
    for (let drawIndex = 0; drawIndex < drawCount; drawIndex += 1) {
        // Fix the legacy `% 9` bug: every 10th draw receives the 4★+ guarantee.
        const guaranteed = (drawIndex + 1) % 10 === 0;
        const rankIndex = weightedIndex(random, rankWeights(gacha, guaranteed));
        const rankPool = gacha.pool[rankIndex + 1];
        if (!rankPool) throw new InvariantError(`Missing gacha pool rank ${rankIndex + 1}.`);
        result.push(choosePoolItem(random, rankPool).id);
    }
    return result;
}

export function presentCharacterDraw(
    random: RandomSource,
    catalog: GachaCatalog,
    gacha: GachaDefinition,
    characterId: number,
    duplicateItem?: { id: number; count: number },
): CharacterDrawPresentation {
    const movieRank = Math.floor(characterId / 100000);
    const movieWeights = MOVIE_WEIGHTS[movieRank - 1] ?? [100];
    const movieType = weightedIndex(random, movieWeights) as GachaMovieType;
    const rateUp = isRateUpCharacterGacha(gacha);
    const seeds = catalog.getMovieSeeds(movieRank, movieType, rateUp);
    if (seeds.length === 0) {
        throw new InvariantError(
            `No movie seeds for rank ${movieRank}, movie type ${movieType}, rateUp=${rateUp}.`,
        );
    }
    const seed = seeds[random.nextInt(0, seeds.length)] as number;
    const movieId = movieType === GachaMovieType.NORMAL
        ? (gacha.movieName ?? "normal")
        : (gacha.guaranteeMovieName ?? gacha.movieName ?? "normal");

    return {
        characterId,
        movieId,
        seed,
        entryCount: 1,
        ...(duplicateItem === undefined ? {} : { exBoostItem: duplicateItem }),
    };
}

export function gachaContainsItem(gacha: GachaDefinition, itemId: number): boolean {
    return Object.values(gacha.pool).some((pool) => pool.some((item) => item.id === itemId));
}
