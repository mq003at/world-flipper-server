import type { GachaDefinition } from "../../content/master-data/gacha-catalog";
import type { RuntimeGachaBanner, SeasonalContentType, SeasonalGachaSlot } from "./seasonal-gacha.models";

export interface FeatureHistoryEntry {
    contentId: number;
    lastGlobalCycle: number;
}

export interface SeasonalGachaRepository {
    findBanner(seasonNumber: number, cycleIndex: number, slot: SeasonalGachaSlot): RuntimeGachaBanner | null;
    saveBanner(banner: RuntimeGachaBanner): void;
    listReleased(contentType: SeasonalContentType): number[];
    release(contentType: SeasonalContentType, ids: readonly number[], seasonNumber: number, cycleIndex: number, at: Date): void;
    featureHistory(contentType: SeasonalContentType, slot: SeasonalGachaSlot): FeatureHistoryEntry[];
    recordFeatured(contentType: SeasonalContentType, ids: readonly number[], slot: SeasonalGachaSlot, globalCycle: number, at: Date): void;
    ensureEntitlement(playerId: number, dayKey: string): void;
    isEntitlementAvailable(playerId: number, dayKey: string): boolean;
    consumeEntitlement(playerId: number, dayKey: string, consumedAt: Date): boolean;
    transaction<T>(work: () => T): T;
}

export interface PersistedDefinition extends GachaDefinition {}
