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
import { JsonQuestCatalog } from "../content/master-data/json-quest-catalog";
import type { Clock } from "../infrastructure/clock/clock";
import { SystemClock } from "../infrastructure/clock/system-clock";
import { createDatabase, type DatabaseConnection } from "../infrastructure/database/database";
import { CryptoRandomSource } from "../infrastructure/random/crypto-random-source";
import type { RandomSource } from "../infrastructure/random/random-source";
import { CryptoTokenGenerator, type TokenGenerator } from "../infrastructure/security/token-generator";
import { createAssetRoutes } from "../modules/asset/asset.routes";
import { AssetService } from "../modules/asset/asset.service";
import { createGameBootstrapRoutes } from "../modules/bootstrap/game-bootstrap.routes";
import { GameBootstrapService } from "../modules/bootstrap/game-bootstrap.service";
import { infodeskRoutes } from "../modules/bootstrap/infodesk.routes";
import { createIdentityRoutes } from "../modules/identity/identity.routes";
import { SqliteIdentityRepository } from "../modules/identity/identity.repository.sqlite";
import { IdentityService } from "../modules/identity/identity.service";
import { SqlitePlayerRepository } from "../modules/player/player.repository.sqlite";
import { PlayerService } from "../modules/player/player.service";
import { SqliteRewardRepository } from "../modules/reward/reward.repository.sqlite";
import { RewardService } from "../modules/reward/reward.service";
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

    const identityRepository = new SqliteIdentityRepository(database);
    const identityService = new IdentityService(identityRepository, clock, tokens);
    const playerRepository = new SqlitePlayerRepository(database);
    const playerService = new PlayerService(playerRepository, clock);
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
    );

    const gameBootstrapService = new GameBootstrapService(
        identityService,
        playerService,
        assetVersionProvider,
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
    await app.register(createSingleBattleQuestRoutes(questService, clock), {
        prefix: "/latest/api/index.php/single_battle_quest",
    });
    await app.register(createStoryQuestRoutes(questService, clock), {
        prefix: "/latest/api/index.php/story_quest",
    });
    await app.register(createStaticContentPlugin({ cdnDir: config.cdnDir }));

    app.get("/healthz", async () => ({ status: "ok" }));

    if (ownsDatabase) {
        app.addHook("onClose", async () => {
            database.close();
        });
    }

    return app;
}
