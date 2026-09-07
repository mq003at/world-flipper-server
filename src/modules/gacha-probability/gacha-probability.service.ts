import type { DisplayCatalog } from "../../content/display/display-catalog";
import type { Clock } from "../../infrastructure/clock/clock";
import type { RuntimeGachaBanner, SeasonalContentType } from "../gacha/seasonal-gacha.models";
import type { SeasonalGachaService } from "../gacha/seasonal-gacha.service";
import type { ActiveProbabilityManifest, ProbabilityBanner, ProbabilityEntry } from "./gacha-probability.models";

const RANKS = [5, 4, 3] as const;

export class GachaProbabilityService {
    constructor(
        private readonly seasonal: SeasonalGachaService,
        private readonly display: DisplayCatalog,
        private readonly clock: Clock,
    ) {}

    activeManifest(now = this.clock.now()): ActiveProbabilityManifest {
        return {
            generatedAt: now.toISOString(),
            banners: this.seasonal.activeBanners(now).map((banner) => this.presentBanner(banner)),
        };
    }

    private presentBanner(banner: RuntimeGachaBanner): ProbabilityBanner {
        const contentType: SeasonalContentType = banner.slot === "weapon" ? "equipment" : "character";
        const rankWeights = banner.definition.rankWeights ?? [500, 2500, 7000];
        const entries: ProbabilityEntry[] = [];
        for (let index = 0; index < RANKS.length; index += 1) {
            const rarity = RANKS[index];
            const pool = banner.definition.pool[index + 1] ?? [];
            const poolWeight = pool.reduce((sum, item) => sum + item.weight, 0);
            for (const item of pool) {
                const metadata = this.display.find(contentType, item.id);
                entries.push({
                    id: item.id,
                    name: metadata.name,
                    contentType,
                    rarity,
                    ...(metadata.element === undefined ? {} : { element: metadata.element }),
                    featured: item.isRateUp,
                    ratePercent: poolWeight === 0 ? 0 : rankWeights[index] / 100 * item.weight / poolWeight,
                    ...(metadata.title ? { title: metadata.title } : {}),
                    ...(metadata.iconPath ? { iconPath: metadata.iconPath } : {}),
                });
            }
        }
        return {
            seasonNumber: banner.seasonNumber,
            cycleIndex: banner.cycleIndex,
            slot: banner.slot,
            shellGachaId: banner.shellGachaId,
            festival: banner.festival,
            startsAt: banner.startsAt.toISOString(),
            endsAt: banner.endsAt.toISOString(),
            rarityRatesPercent: Object.fromEntries(RANKS.map((rank, index) => [String(rank), rankWeights[index] / 100])),
            featuredIds: [...banner.featuredIds],
            entries,
        };
    }
}
