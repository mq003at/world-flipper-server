import Fastify, { type FastifyInstance } from "fastify";
import type { AppConfig } from "./config";
import { errorHandlerPlugin } from "./plugins/error-handler";
import { protocolCodecPlugin } from "./plugins/protocol-codec";
import { createStaticContentPlugin } from "./plugins/static-content";
import { CdnAvailabilityService } from "../content/cdn/cdn-availability.service";
import { CdnAssetVersionProvider } from "../content/cdn/asset-version";
import { JsonAssetManifestRepository } from "../content/cdn/json-asset-manifest.repository";
import { ModRegistry } from "../content/cdn/mod-registry";
import type { Clock } from "../infrastructure/clock/clock";
import { SystemClock } from "../infrastructure/clock/system-clock";
import { createDatabase, type DatabaseConnection } from "../infrastructure/database/database";
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

export interface AppDependencies {
    clock?: Clock;
    tokens?: TokenGenerator;
    database?: DatabaseConnection;
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

    const identityRepository = new SqliteIdentityRepository(database);
    const identityService = new IdentityService(identityRepository, clock, tokens);
    const playerRepository = new SqlitePlayerRepository(database);
    const playerService = new PlayerService(playerRepository, clock);

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

    const gameBootstrapService = new GameBootstrapService(
        identityService,
        playerService,
        assetVersionProvider,
    );

    await app.register(protocolCodecPlugin);
    await app.register(errorHandlerPlugin);

    await app.register(createIdentityRoutes(identityService, clock), {
        prefix: "/openapi/service",
    });

    await app.register(infodeskRoutes, {
        prefix: "/infodesk",
    });

    await app.register(createGameBootstrapRoutes(gameBootstrapService, clock), {
        prefix: "/latest/api/index.php",
    });

    await app.register(createAssetRoutes(assetService, clock), {
        prefix: "/latest/api/index.php/asset",
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
