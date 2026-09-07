export enum GachaType {
    CHARACTER = 0,
    WEAPON = 1,
}

export enum GachaMovieType {
    NORMAL = 0,
    GUARANTEE = 1,
}

export interface GachaPoolItem {
    id: number;
    rank: number;
    odds: number;
    isRateUp: boolean;
    /**
     * Legacy Starpoint's converter stores the per-item draw weight in a field named
     * `rarity`. Keep the wire/master contract isolated here and expose it as weight.
     */
    weight: number;
}

export interface GachaDefinition {
    id: number;
    type: GachaType;
    paymentType: number;
    singleCost: number;
    multiCost: number;
    discountCost: number;
    startDate: string;
    endDate: string;
    pool: Readonly<Record<number, readonly GachaPoolItem[]>>;
    movieName?: string;
    guaranteeMovieName?: string;
    /** Runtime-only rank weights ordered as 5★, 4★, 3★. */
    rankWeights?: readonly [number, number, number];
}

export interface GachaCatalog {
    findById(gachaId: number): GachaDefinition | null;
    listAll(): readonly GachaDefinition[];
    findCampaignId(gachaId: number): number | null;
    getMovieSeeds(movieRank: number, movieType: GachaMovieType, rateUp: boolean): readonly number[];
}
