import type { RuntimeGachaSlot, SeasonalContentType } from "../gacha/seasonal-gacha.models";

export interface ProbabilityEntry {
    id: number;
    name: string;
    contentType: SeasonalContentType;
    rarity: number;
    element?: number;
    featured: boolean;
    ratePercent: number;
    title?: string;
    iconPath?: string;
}

export interface ProbabilityBanner {
    seasonNumber: number;
    cycleIndex: number;
    slot: RuntimeGachaSlot;
    shellGachaId: number;
    festival: boolean;
    startsAt: string;
    endsAt: string;
    rarityRatesPercent: Record<string, number>;
    featuredIds: number[];
    entries: ProbabilityEntry[];
}

export interface ActiveProbabilityManifest {
    generatedAt: string;
    banners: ProbabilityBanner[];
}
