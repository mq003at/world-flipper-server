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
import { JsonBoxGachaCatalog } from "../content/master-data/json-box-gacha-catalog";
import { JsonGachaCatalog } from "../content/master-data/json-gacha-catalog";
import { JsonQuestCatalog } from "../content/master-data/json-quest-catalog";
import { JsonShopCatalog } from "../content/master-data/json-shop-catalog";
import type { Clock } from "../infrastructure/clock/clock";
import { SystemClock } from "../infrastructure/clock/system-clock";
import { createDatabase, type DatabaseConnection } from "../infrastructure/database/database";
import { CryptoRandomSource } from "../infrastructure/random/crypto-random-source";
import { SeasonEconomyPolicy } from "../live/economy/season-economy.policy";
import { PlayerLifecycleService } from "../live/lifecycle/player-lifecycle.service";
import { SqlitePlayerLifecycleRepository } from "../live/lifecycle/player-lifecycle.repository.sqlite";
import { JsonQuestStaminaCostCatalog } from "../live/economy/json-quest-stamina-cost.catalog";
import { InProcessGameplayEventBus } from "../live/gameplay-events/in-process-gameplay-event-bus";
import { JsonScheduleCatalog } from "../live/schedule/json-schedule-catalog";
import { ScheduleService } from "../live/schedule/schedule.service";
import { SeasonalWindowResolver } from "../live/schedule/seasonal-window-resolver";
import { LifecyclePeriods } from "../live/time/lifecycle-periods";
import { loadSeasonConfig } from "../live/time/json-season-config";
import { SeasonTimeline } from "../live/time/season-timeline";
import type { RandomSource } from "../infrastructure/random/random-source";
import { CryptoTokenGenerator, type TokenGenerator } from "../infrastructure/security/token-generator";
import { createAssetRoutes } from "../modules/asset/asset.routes";
import { AssetService } from "../modules/asset/asset.service";
import { createGameBootstrapRoutes } from "../modules/bootstrap/game-bootstrap.routes";
import { createBoxGachaRoutes } from "../modules/events/box-gacha/box-gacha.routes";
import { SqliteBoxGachaRepository } from "../modules/events/box-gacha/box-gacha.repository.sqlite";
import { BoxGachaService } from "../modules/events/box-gacha/box-gacha.service";
import { JsonEventCatalog } from "../modules/events/event-registry/json-event.catalog";
import { EventRegistry } from "../modules/events/event-registry/event.registry";
import { SqliteEventRepository } from "../modules/events/event-registry/event.repository.sqlite";
import { EventService } from "../modules/events/event-registry/event.service";
import { createEventRoutes } from "../modules/events/event-registry/event.routes";
import { JsonRushEventCatalog } from "../modules/events/rush/json-rush-event.catalog";
import { SqliteRushEventRepository } from "../modules/events/rush/rush-event.repository.sqlite";
import { RushQuestFinishExtension } from "../modules/events/rush/rush-event.completion";
import { RushEventService } from "../modules/events/rush/rush-event.service";
import { createRushEventRoutes } from "../modules/events/rush/rush-event.routes";
import { SqliteRankingEventRepository } from "../modules/events/ranking/ranking-event.repository.sqlite";
import { RankingEventService } from "../modules/events/ranking/ranking-event.service";
import { createRankingEventRoutes } from "../modules/events/ranking/ranking-event.routes";
import { SqliteRaidEventRepository } from "../modules/events/raid/raid-event.repository.sqlite";
import { RaidEventService } from "../modules/events/raid/raid-event.service";
import { createRaidEventRoutes } from "../modules/events/raid/raid-event.routes";
import { createMultiBattleQuestRoutes } from "../modules/events/raid/multi-battle-quest.routes";
import { createGachaRoutes } from "../modules/gacha/gacha.routes";
import { SqliteGachaRepository } from "../modules/gacha/gacha.repository.sqlite";
import { GachaService } from "../modules/gacha/gacha.service";
import { SeasonalGachaAvailabilityPolicy } from "../modules/gacha/gacha-availability.policy";
import { GameBootstrapService } from "../modules/bootstrap/game-bootstrap.service";
import { infodeskRoutes } from "../modules/bootstrap/infodesk.routes";
import { createIdentityRoutes } from "../modules/identity/identity.routes";
import { SqliteIdentityRepository } from "../modules/identity/identity.repository.sqlite";
import { IdentityService } from "../modules/identity/identity.service";
import { JsonMailCatalog } from "../modules/mail/json-mail.catalog";
import { SqliteMailRepository } from "../modules/mail/mail.repository.sqlite";
import { createMailRoutes } from "../modules/mail/mail.routes";
import { MailService } from "../modules/mail/mail.service";
import { JsonMissionCatalog } from "../modules/mission/json-mission.catalog";
import { SqliteMissionRepository } from "../modules/mission/mission.repository.sqlite";
import { createMissionRoutes } from "../modules/mission/mission.routes";
import { MissionService } from "../modules/mission/mission.service";
import { SqlitePlayerRepository } from "../modules/player/player.repository.sqlite";
import { PlayerService } from "../modules/player/player.service";
import { SqlitePlayerDataRepository } from "../modules/player-data/player-data.repository.sqlite";
import { createPlayerDataRoutes } from "../modules/player-data/player-data.routes";
import { PlayerDataService } from "../modules/player-data/player-data.service";
import { SqlitePaymentRepository } from "../modules/payment/payment.repository.sqlite";
import { createPaymentRoutes } from "../modules/payment/payment.routes";
import { PaymentService } from "../modules/payment/payment.service";
import { SqliteRewardRepository } from "../modules/reward/reward.repository.sqlite";
import { RewardService } from "../modules/reward/reward.service";
import { SqliteShopRepository } from "../modules/shop/shop.repository.sqlite";
import { createShopRoutes } from "../modules/shop/shop.routes";
import { ShopService } from "../modules/shop/shop.service";
import { SeasonalShopAvailabilityPolicy } from "../modules/shop/seasonal-shop-availability.policy";
import { SqliteQuestRepository } from "../modules/quest/quest.repository.sqlite";
import { QuestService } from "../modules/quest/quest.service";
import { createSingleBattleQuestRoutes } from "../modules/quest/single-battle-quest.routes";
import { createStoryQuestRoutes } from "../modules/quest/story-quest.routes";
import { createAttentionRoutes } from "../modules/compatibility/attention.routes";
import { createEncyclopediaRoutes } from "../modules/compatibility/encyclopedia.routes";
import {
    createOptionRoutes,
    createPartyGroupRoutes,
    createPartyRoutes,
} from "../modules/player-customization/player-customization.routes";
import { SqlitePlayerCustomizationRepository } from "../modules/player-customization/player-customization.repository.sqlite";
import { PlayerCustomizationService } from "../modules/player-customization/player-customization.service";
import { DEFAULT_TUTORIAL_CONFIG } from "../modules/tutorial/tutorial.config";
import { SqliteTutorialRepository } from "../modules/tutorial/tutorial.repository.sqlite";
import { createTutorialRoutes } from "../modules/tutorial/tutorial.routes";
import { TutorialService } from "../modules/tutorial/tutorial.service";
import { createReproduceRoutes } from "../protocol/worldflipper/reproduce.routes";

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
    const seasonalWindows = new SeasonalWindowResolver(seasonTimeline);
    const gameplayEvents = new InProcessGameplayEventBus();
    const staminaCosts = new JsonQuestStaminaCostCatalog(liveContentDir);
    const eventCatalog = new JsonEventCatalog(liveContentDir);
    const eventRegistry = new EventRegistry(eventCatalog, schedule);

    const identityRepository = new SqliteIdentityRepository(database);
    const identityService = new IdentityService(identityRepository, clock, tokens);
    const playerRepository = new SqlitePlayerRepository(database);
    const playerLifecycleRepository = new SqlitePlayerLifecycleRepository(database);
    const playerLifecycleService = new PlayerLifecycleService(playerLifecycleRepository, lifecycle, clock);
    const playerService = new PlayerService(playerRepository, clock, lifecycle, playerLifecycleService);
    const playerCustomizationRepository = new SqlitePlayerCustomizationRepository(database);
    const playerCustomizationService = new PlayerCustomizationService(
        identityService,
        playerService,
        playerCustomizationRepository,
    );
    const playerDataRepository = new SqlitePlayerDataRepository(database);
    const playerDataService = new PlayerDataService(playerDataRepository, clock);
    const eventRepository = new SqliteEventRepository(database);
    const eventService = new EventService(
        identityService,
        playerService,
        eventRepository,
        eventRegistry,
        clock,
    );
    gameplayEvents.subscribe((event) => eventService.handleGameplayEvent(event));
    const tutorialRepository = new SqliteTutorialRepository(database);

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
    const mailCatalog = new JsonMailCatalog(liveContentDir);
    const mailRepository = new SqliteMailRepository(database);
    const mailService = new MailService(
        identityService,
        playerService,
        mailRepository,
        mailCatalog,
        rewardService,
        clock,
        schedule,
        economy,
    );
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
    const tutorialService = new TutorialService(
        identityService,
        playerService,
        tutorialRepository,
        gachaCatalog,
        rewardService,
        clock,
        random,
        DEFAULT_TUTORIAL_CONFIG,
    );
    const gachaRepository = new SqliteGachaRepository(database);
    const gachaAvailability = new SeasonalGachaAvailabilityPolicy(seasonalWindows, schedule);
    const gachaService = new GachaService(
        identityService,
        playerService,
        gachaRepository,
        gachaCatalog,
        rewardService,
        random,
        gameplayEvents,
        clock,
        gachaAvailability,
    );
    const questCatalog = new JsonQuestCatalog(config.masterDataDir);
    const questRepository = new SqliteQuestRepository(database);
    const rushEventCatalog = new JsonRushEventCatalog(config.masterDataDir);
    const rushEventRepository = new SqliteRushEventRepository(database);
    const rushFinishExtension = new RushQuestFinishExtension(rushEventRepository, rushEventCatalog, rewardService);
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
        eventRegistry,
        rushFinishExtension,
    );
    const rushEventService = new RushEventService(
        identityService,
        playerService,
        rushEventRepository,
        rushEventCatalog,
        questService,
        clock,
        eventRegistry,
    );
    const rankingEventRepository = new SqliteRankingEventRepository(database);
    const rankingEventService = new RankingEventService(
        identityService,
        playerService,
        questRepository,
        rankingEventRepository,
        clock,
        eventRegistry,
    );
    const raidEventRepository = new SqliteRaidEventRepository(database);
    const raidEventService = new RaidEventService(
        identityService,
        playerService,
        raidEventRepository,
        clock,
        eventRegistry,
    );
    const shopCatalog = new JsonShopCatalog(config.masterDataDir);
    const shopRepository = new SqliteShopRepository(database);
    const shopAvailability = new SeasonalShopAvailabilityPolicy(eventRegistry, seasonalWindows, schedule);
    const shopService = new ShopService(
        identityService,
        playerService,
        shopRepository,
        shopCatalog,
        rewardService,
        clock,
        gameplayEvents,
        shopAvailability,
        lifecycle,
    );
    const paymentRepository = new SqlitePaymentRepository(database);
    const paymentService = new PaymentService(
        identityService,
        playerService,
        paymentRepository,
        clock,
    );
    const boxGachaCatalog = new JsonBoxGachaCatalog(config.masterDataDir);
    const boxGachaRepository = new SqliteBoxGachaRepository(database);
    const boxGachaService = new BoxGachaService(
        identityService,
        playerService,
        boxGachaRepository,
        boxGachaCatalog,
        rewardService,
        clock,
        random,
        eventRegistry,
    );

    const gameBootstrapService = new GameBootstrapService(
        identityService,
        playerService,
        assetVersionProvider,
        gameplayEvents,
        mailService,
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
    await app.register(
        createPlayerDataRoutes(playerDataService, identityService, playerService, clock, {
            importEnabled: config.playerDataImportEnabled ?? false,
        }),
        { prefix: "/latest/api/index.php/player_data" },
    );
    await app.register(createAssetRoutes(assetService, clock), {
        prefix: "/latest/api/index.php/asset",
    });
    await app.register(createTutorialRoutes(tutorialService, clock), {
        prefix: "/latest/api/index.php/tutorial",
    });
    await app.register(createOptionRoutes(playerCustomizationService, clock), {
        prefix: "/latest/api/index.php/option",
    });
    await app.register(createPartyRoutes(playerCustomizationService, clock), {
        prefix: "/latest/api/index.php/party",
    });
    await app.register(createPartyGroupRoutes(playerCustomizationService, clock), {
        prefix: "/latest/api/index.php/party_group",
    });
    await app.register(createAttentionRoutes(identityService, playerService, clock), {
        prefix: "/latest/api/index.php/attention",
    });
    await app.register(createEncyclopediaRoutes(identityService, clock), {
        prefix: "/latest/api/index.php/encyclopedia",
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
    await app.register(createMailRoutes(mailService, clock), {
        prefix: "/latest/api/index.php/mail",
    });
    await app.register(createEventRoutes(eventService, clock), {
        prefix: "/latest/api/index.php/event",
    });
    await app.register(createBoxGachaRoutes(boxGachaService, clock), {
        prefix: "/latest/api/index.php/box_gacha",
    });
    await app.register(createRushEventRoutes(rushEventService, clock), {
        prefix: "/latest/api/index.php/rush_event",
    });
    await app.register(createRushEventRoutes(rushEventService, clock), {
        prefix: "/latest/api/index.php/event/rush",
    });
    await app.register(createRankingEventRoutes(rankingEventService, clock), {
        prefix: "/latest/api/index.php/ranking_event",
    });
    await app.register(createRaidEventRoutes(raidEventService, clock), {
        prefix: "/latest/api/index.php/raid_event",
    });
    await app.register(createRaidEventRoutes(raidEventService, clock), {
        prefix: "/latest/api/index.php/event/raid",
    });
    await app.register(createMultiBattleQuestRoutes(identityService, clock), {
        prefix: "/latest/api/index.php/multi_battle_quest",
    });
    await app.register(createShopRoutes(shopService, clock), {
        prefix: "/latest/api/index.php/shop",
    });
    await app.register(createPaymentRoutes(paymentService, clock), {
        prefix: "/latest/api/index.php/payment",
    });
    await app.register(createReproduceRoutes(clock), {
        prefix: "/latest/api/index.php/reproduce",
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
            monthlyPeriod: lifecycle.monthlyKey(now),
            activeSchedule: {
                gacha: schedule.getActive("gacha", now).map((entry) => entry.id),
                shop: schedule.getActive("shop", now).map((entry) => entry.id),
                event: schedule.getActive("event", now).map((entry) => entry.id),
                mission: schedule.getActive("mission", now).map((entry) => entry.id),
                mail: schedule.getActive("mail", now).map((entry) => entry.id),
                eventRegistry: eventRegistry.listActive(now).map((entry) => entry.definition.id),
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
