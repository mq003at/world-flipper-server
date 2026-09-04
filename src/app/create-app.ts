import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import type { AppConfig } from "./config";
import { registerErrorHandler } from "./plugins/error-handler";
import { registerProtocolCodec } from "./plugins/protocol-codec";
import { createStaticContentPlugin } from "./plugins/static-content";
import { CdnAvailabilityService } from "../content/cdn/cdn-availability.service";
import { CdnAssetVersionProvider } from "../content/cdn/asset-version";
import { JsonAssetManifestRepository } from "../content/cdn/json-asset-manifest.repository";
import { ModRegistry } from "../content/cdn/mod-registry";
import { JsonCharacterCatalog } from "../content/master-data/json-character-catalog";
import { JsonGachaCatalog } from "../content/master-data/json-gacha-catalog";
import { JsonQuestCatalog } from "../content/master-data/json-quest-catalog";
import { JsonShopCatalog } from "../content/master-data/json-shop-catalog";
import type { Clock } from "../infrastructure/clock/clock";
import { SystemClock } from "../infrastructure/clock/system-clock";
import { createDatabase, type DatabaseConnection } from "../infrastructure/database/database";
import { CryptoRandomSource } from "../infrastructure/random/crypto-random-source";
import { SeasonEconomyPolicy } from "../live/economy/season-economy.policy";
import { JsonQuestStaminaCostCatalog } from "../live/economy/json-quest-stamina-cost.catalog";
import { InProcessGameplayEventBus } from "../live/gameplay-events/in-process-gameplay-event-bus";
import { JsonScheduleCatalog } from "../live/schedule/json-schedule-catalog";
import { ScheduleService } from "../live/schedule/schedule.service";
import { LifecyclePeriods } from "../live/time/lifecycle-periods";
import { loadSeasonConfig } from "../live/time/json-season-config";
import { SeasonTimeline } from "../live/time/season-timeline";
import type { RandomSource } from "../infrastructure/random/random-source";
import { CryptoTokenGenerator, type TokenGenerator } from "../infrastructure/security/token-generator";
import { createAssetRoutes } from "../modules/asset/asset.routes";
import { AssetService } from "../modules/asset/asset.service";
import { createGameBootstrapRoutes } from "../modules/bootstrap/game-bootstrap.routes";
import { createGachaRoutes } from "../modules/gacha/gacha.routes";
import { SqliteGachaRepository } from "../modules/gacha/gacha.repository.sqlite";
import { GachaService } from "../modules/gacha/gacha.service";
import { GameBootstrapService } from "../modules/bootstrap/game-bootstrap.service";
import { infodeskRoutes } from "../modules/bootstrap/infodesk.routes";
import { createIdentityRoutes } from "../modules/identity/identity.routes";
import { SqliteIdentityRepository } from "../modules/identity/identity.repository.sqlite";
import { IdentityService } from "../modules/identity/identity.service";
import { JsonMissionCatalog } from "../modules/mission/json-mission.catalog";
import { SqliteMissionRepository } from "../modules/mission/mission.repository.sqlite";
import { createMissionRoutes } from "../modules/mission/mission.routes";
import { MissionService } from "../modules/mission/mission.service";
import { SqlitePlayerRepository } from "../modules/player/player.repository.sqlite";
import { PlayerService } from "../modules/player/player.service";
import { SqlitePaymentRepository } from "../modules/payment/payment.repository.sqlite";
import { createPaymentRoutes } from "../modules/payment/payment.routes";
import { PaymentService } from "../modules/payment/payment.service";
import { SqliteRewardRepository } from "../modules/reward/reward.repository.sqlite";
import { RewardService } from "../modules/reward/reward.service";
import { SqliteShopRepository } from "../modules/shop/shop.repository.sqlite";
import { createShopRoutes } from "../modules/shop/shop.routes";
import { ShopService } from "../modules/shop/shop.service";
import { SqliteQuestRepository } from "../modules/quest/quest.repository.sqlite";
import { QuestService } from "../modules/quest/quest.service";
import { createSingleBattleQuestRoutes } from "../modules/quest/single-battle-quest.routes";
import { createStoryQuestRoutes } from "../modules/quest/story-quest.routes";
import { DEFAULT_TUTORIAL_CONFIG } from "../modules/tutorial/tutorial.config";
import { SqliteTutorialRepository } from "../modules/tutorial/tutorial.repository.sqlite";
import { createTutorialRoutes } from "../modules/tutorial/tutorial.routes";
import { TutorialService } from "../modules/tutorial/tutorial.service";

export interface AppDependencies {
    clock?: Clock;
    tokens?: TokenGenerator;
    database?: DatabaseConnection;
    random?: RandomSource;
}

export async function createApp(
    config: AppConfig,
    dependencies: AppDependencies = {},
): Promise<FastifyInstance> {
    const app = Fastify({ logger: config.logger });

    const ownsDatabase = dependencies.database === undefined;
    const database = dependencies.database ?? createDatabase(config.databasePath);
    const clock = dependencies.clock ?? new SystemClock();
    const tokens = dependencies.tokens ?? new CryptoTokenGenerator();
    const random = dependencies.random ?? new CryptoRandomSource();

    const liveContentDir = config.liveContentDir ?? path.resolve(process.cwd(), "content/live");
    const seasonConfig = loadSeasonConfig(liveContentDir, config.seasonStartAtOverride);
    const seasonTimeline = new SeasonTimeline(seasonConfig);
    const lifecycle = new LifecyclePeriods(
        seasonConfig.dailyResetHourUtc,
        seasonConfig.weekStartsOnUtcDay,
    );
    const economy = new SeasonEconomyPolicy(seasonConfig, seasonTimeline);
    const schedule = new ScheduleService(new JsonScheduleCatalog(liveContentDir), seasonTimeline);
    const gameplayEvents = new InProcessGameplayEventBus();
    const staminaCosts = new JsonQuestStaminaCostCatalog(liveContentDir);

    const identityRepository = new SqliteIdentityRepository(database);
    const identityService = new IdentityService(identityRepository, clock, tokens);
    const playerRepository = new SqlitePlayerRepository(database);
    const playerService = new PlayerService(playerRepository, clock, lifecycle);
    const tutorialRepository = new SqliteTutorialRepository(database);
    const tutorialService = new TutorialService(
        identityService,
        playerService,
        tutorialRepository,
        clock,
        random,
        DEFAULT_TUTORIAL_CONFIG,
    );

    const modRegistry = new ModRegistry(config.cdnDir);
    modRegistry.initialize();
    const assetVersionProvider = new CdnAssetVersionProvider(modRegistry);
    const assetManifestRepository = new JsonAssetManifestRepository(config.assetManifestDir);
    const cdnAvailability = new CdnAvailabilityService(config.cdnDir);
    const assetService = new AssetService(
        assetManifestRepository,
        cdnAvailability,
        assetVersionProvider,
        modRegistry,
    );

    const characterCatalog = new JsonCharacterCatalog(config.masterDataDir);
    const rewardRepository = new SqliteRewardRepository(database);
    const rewardService = new RewardService(rewardRepository, characterCatalog, clock);
    const missionCatalog = new JsonMissionCatalog(liveContentDir);
    const missionRepository = new SqliteMissionRepository(database);
    const missionService = new MissionService(
        identityService,
        playerService,
        missionRepository,
        missionCatalog,
        rewardService,
        clock,
        lifecycle,
        schedule,
        economy,
    );
    gameplayEvents.subscribe((event) => missionService.handleGameplayEvent(event));
    const gachaCatalog = new JsonGachaCatalog(config.masterDataDir);
    const gachaRepository = new SqliteGachaRepository(database);
    const gachaService = new GachaService(
        identityService,
        playerService,
        gachaRepository,
        gachaCatalog,
        rewardService,
        random,
        gameplayEvents,
    );
    const questCatalog = new JsonQuestCatalog(config.masterDataDir);
    const questRepository = new SqliteQuestRepository(database);
    const questService = new QuestService(
        identityService,
        playerService,
        questRepository,
        questCatalog,
        rewardService,
        characterCatalog,
        clock,
        random,
        staminaCosts,
        economy,
        gameplayEvents,
    );
    const shopCatalog = new JsonShopCatalog(config.masterDataDir);
    const shopRepository = new SqliteShopRepository(database);
    const shopService = new ShopService(
        identityService,
        playerService,
        shopRepository,
        shopCatalog,
        rewardService,
        clock,
        gameplayEvents,
    );
    const paymentRepository = new SqlitePaymentRepository(database);
    const paymentService = new PaymentService(
        identityService,
        playerService,
        paymentRepository,
        clock,
    );

    const gameBootstrapService = new GameBootstrapService(
        identityService,
        playerService,
        assetVersionProvider,
        gameplayEvents,
    );

    registerProtocolCodec(app);
    registerErrorHandler(app);

    await app.register(createIdentityRoutes(identityService, clock), {
        prefix: "/openapi/service",
    });
    await app.register(infodeskRoutes, { prefix: "/infodesk" });
    await app.register(createGameBootstrapRoutes(gameBootstrapService, clock), {
        prefix: "/latest/api/index.php",
    });
    await app.register(createAssetRoutes(assetService, clock), {
        prefix: "/latest/api/index.php/asset",
    });
    await app.register(createTutorialRoutes(tutorialService, clock), {
        prefix: "/latest/api/index.php/tutorial",
    });
    await app.register(createGachaRoutes(gachaService, clock), {
        prefix: "/latest/api/index.php/gacha",
    });
    await app.register(createSingleBattleQuestRoutes(questService, clock), {
        prefix: "/latest/api/index.php/single_battle_quest",
    });
    await app.register(createStoryQuestRoutes(questService, clock), {
        prefix: "/latest/api/index.php/story_quest",
    });
    await app.register(createMissionRoutes(missionService, clock), {
        prefix: "/latest/api/index.php/mission",
    });
    await app.register(createShopRoutes(shopService, clock), {
        prefix: "/latest/api/index.php/shop",
    });
    await app.register(createPaymentRoutes(paymentService, clock), {
        prefix: "/latest/api/index.php/payment",
    });
    await app.register(createStaticContentPlugin({ cdnDir: config.cdnDir }));

    app.get("/live/status", async () => {
        const now = clock.now();
        const position = seasonTimeline.position(now);
        return {
            now: now.toISOString(),
            seasonStartsAt: seasonTimeline.seasonStartsAt.toISOString(),
            seasonEndsAt: seasonTimeline.seasonEndsAt.toISOString(),
            seasonDay: position.seasonDay,
            progress: position.progress,
            sourceTime: position.sourceTime.toISOString(),
            compressionRatio: seasonTimeline.compressionRatio,
            dailyPeriod: lifecycle.dailyKey(now),
            weeklyPeriod: lifecycle.weeklyKey(now),
            activeSchedule: {
                gacha: schedule.getActive("gacha", now).map((entry) => entry.id),
                shop: schedule.getActive("shop", now).map((entry) => entry.id),
                event: schedule.getActive("event", now).map((entry) => entry.id),
                mission: schedule.getActive("mission", now).map((entry) => entry.id),
            },
        };
    });

    app.get("/healthz", async () => ({ status: "ok" }));

    if (ownsDatabase) {
        app.addHook("onClose", async () => {
            database.close();
        });
    }

    return app;
}
