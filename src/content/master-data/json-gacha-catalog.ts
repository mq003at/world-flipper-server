import { readFileSync } from "node:fs";
import path from "node:path";
import { InvariantError } from "../../shared/errors/application-error";
import {
    GachaMovieType,
    type GachaCatalog,
    type GachaDefinition,
    type GachaPoolItem,
    type GachaType,
} from "./gacha-catalog";

interface RawGachaPoolItem {
    id: number;
    rank: number;
    odds: number;
    isRateUp: boolean;
    rarity: number;
}

interface RawGachaDefinition {
    type: number;
    paymentType: number;
    singleCost: number;
    multiCost: number;
    discountCost: number;
    startDate: string;
    endDate: string;
    pool: Record<string, RawGachaPoolItem[]>;
    movieName?: string;
    guaranteeMovieName?: string;
}

type RawGachaMap = Record<string, RawGachaDefinition>;
type RawCampaignMap = Record<string, number>;
type RawMovieSeeds = Record<string, Record<string, number[]>>;

function readJson<T>(masterDataDir: string, fileName: string): T {
    const filePath = path.join(masterDataDir, fileName);
    try {
        return JSON.parse(readFileSync(filePath, "utf8")) as T;
    } catch (error) {
        throw new InvariantError(
            `Unable to load gacha master data '${fileName}' from '${masterDataDir}': ${String(error)}`,
        );
    }
}

function normalizePool(raw: RawGachaDefinition["pool"]): Record<number, readonly GachaPoolItem[]> {
    const result: Record<number, readonly GachaPoolItem[]> = {};
    for (const [rawRank, items] of Object.entries(raw)) {
        const rank = Number(rawRank);
        result[rank] = items.map((item) => ({
            id: item.id,
            rank: item.rank,
            odds: item.odds,
            isRateUp: item.isRateUp,
            // Compatibility: the legacy converter stores selection weight in `rarity`.
            weight: item.rarity,
        }));
    }
    return result;
}

export class JsonGachaCatalog implements GachaCatalog {
    private gachas: Map<number, GachaDefinition> | null = null;
    private campaigns: Map<number, number> | null = null;
    private normalMovieSeeds: RawMovieSeeds | null = null;
    private rateUpMovieSeeds: RawMovieSeeds | null = null;

    constructor(private readonly masterDataDir: string) {}

    findById(gachaId: number): GachaDefinition | null {
        this.ensureLoaded();
        return this.gachas?.get(gachaId) ?? null;
    }

    listAll(): readonly GachaDefinition[] {
        this.ensureLoaded();
        return [...(this.gachas?.values() ?? [])];
    }

    findCampaignId(gachaId: number): number | null {
        this.ensureLoaded();
        return this.campaigns?.get(gachaId) ?? null;
    }

    getMovieSeeds(
        movieRank: number,
        movieType: GachaMovieType,
        rateUp: boolean,
    ): readonly number[] {
        this.ensureLoaded();
        const source = rateUp ? this.rateUpMovieSeeds : this.normalMovieSeeds;
        return source?.[String(movieRank)]?.[String(movieType)] ?? [];
    }

    private ensureLoaded(): void {
        if (this.gachas !== null) return;

        const rawGachas = readJson<RawGachaMap>(this.masterDataDir, "gacha.json");
        const rawCampaigns = readJson<RawCampaignMap>(this.masterDataDir, "gacha_campaign.json");
        const normalMovieSeeds = readJson<RawMovieSeeds>(
            this.masterDataDir,
            "gacha_movie_seeds.json",
        );
        const rateUpMovieSeeds = readJson<RawMovieSeeds>(
            this.masterDataDir,
            "gacha_rate_up_movie_seeds.json",
        );

        this.gachas = new Map(
            Object.entries(rawGachas).map(([rawId, raw]) => {
                const id = Number(rawId);
                const definition: GachaDefinition = {
                    id,
                    type: raw.type as GachaType,
                    paymentType: raw.paymentType,
                    singleCost: raw.singleCost,
                    multiCost: raw.multiCost,
                    discountCost: raw.discountCost,
                    startDate: raw.startDate,
                    endDate: raw.endDate,
                    pool: normalizePool(raw.pool),
                    ...(raw.movieName === undefined ? {} : { movieName: raw.movieName }),
                    ...(raw.guaranteeMovieName === undefined
                        ? {}
                        : { guaranteeMovieName: raw.guaranteeMovieName }),
                };
                return [id, definition];
            }),
        );
        this.campaigns = new Map(
            Object.entries(rawCampaigns).map(([rawGachaId, campaignId]) => [
                Number(rawGachaId),
                campaignId,
            ]),
        );
        this.normalMovieSeeds = normalMovieSeeds;
        this.rateUpMovieSeeds = rateUpMovieSeeds;
    }
}
