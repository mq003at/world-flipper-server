import type { GachaDefinition } from "../../content/master-data/gacha-catalog";
import type { RuntimeGachaBanner, RuntimeGachaSlot, SeasonalContentType, SeasonalGachaSlot } from "./seasonal-gacha.models";

export interface FeatureHistoryEntry {
    contentId: number;
    lastGlobalCycle: number;
}

export interface SeasonalGachaRepository {
    findBanner(seasonNumber: number, cycleIndex: number, slot: RuntimeGachaSlot): RuntimeGachaBanner | null;
    saveBanner(banner: RuntimeGachaBanner): void;
    isBannerEnabled?(seasonNumber: number, cycleIndex: number, slot: SeasonalGachaSlot): boolean;
    findEnabledBannerByShell?(at: Date, shellGachaId: number): RuntimeGachaBanner | null;
    listEnabledBanners?(at: Date): RuntimeGachaBanner[];
    listReleased(contentType: SeasonalContentType, seasonNumber: number): number[];
    release(contentType: SeasonalContentType, ids: readonly number[], seasonNumber: number, cycleIndex: number, at: Date, sourceBannerType?: string): void;
    featureHistory(contentType: SeasonalContentType, slot: SeasonalGachaSlot, seasonNumber: number): FeatureHistoryEntry[];
    recordFeatured(contentType: SeasonalContentType, ids: readonly number[], slot: SeasonalGachaSlot, seasonNumber: number, cycleIndex: number, at: Date): void;
    ensureEntitlement(playerId: number, dayKey: string): void;
    isEntitlementAvailable(playerId: number, dayKey: string): boolean;
    consumeEntitlement(playerId: number, dayKey: string, consumedAt: Date): boolean;
    consumeBaseFirstMulti(playerId: number, seasonNumber: number, consumedAt: Date): boolean;
    consumeBaseSelector(playerId: number, seasonNumber: number, characterId: number, consumedAt: Date): boolean;
    transaction<T>(work: () => T): T;
}

export interface PersistedDefinition extends GachaDefinition {}
