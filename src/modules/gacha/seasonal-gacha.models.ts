import type { GachaDefinition } from "../../content/master-data/gacha-catalog";

export type SeasonalGachaSlot = "new" | "rerun" | "weapon";
export type RuntimeGachaSlot = SeasonalGachaSlot | `custom-${number}`;
export type SeasonalContentType = "character" | "equipment";

export interface SeasonPosition {
    seasonNumber: number;
    seasonStart: Date;
    seasonEndExclusive: Date;
    cycleIndex: number;
    cycleStart: Date;
    cycleEndExclusive: Date;
}

export interface RuntimeGachaBanner {
    seasonNumber: number;
    cycleIndex: number;
    slot: RuntimeGachaSlot;
    shellGachaId: number;
    featuredIds: number[];
    festival: boolean;
    startsAt: Date;
    endsAt: Date;
    definition: GachaDefinition;
}

export interface SeasonalGachaPortalState {
    shellGachaIds: number[];
    freeCampaignGachaIds?: number[];
    freeCampaignId: number;
    freeCampaignAvailable: boolean;
}
