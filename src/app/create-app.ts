import Fastify, { type FastifyInstance } from "fastify";
import type { AppConfig } from "./config";
import { errorHandlerPlugin } from "./plugins/error-handler";
import { protocolCodecPlugin } from "./plugins/protocol-codec";
import { createStaticContentPlugin } from "./plugins/static-content";
import type { Clock } from "../infrastructure/clock/clock";
import { SystemClock } from "../infrastructure/clock/system-clock";
import { createDatabase, type DatabaseConnection } from "../infrastructure/database/database";
import { CryptoTokenGenerator, type TokenGenerator } from "../infrastructure/security/token-generator";
import { infodeskRoutes } from "../modules/bootstrap/infodesk.routes";
import { createIdentityRoutes } from "../modules/identity/identity.routes";
import { SqliteIdentityRepository } from "../modules/identity/identity.repository.sqlite";
import { IdentityService } from "../modules/identity/identity.service";

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

    await app.register(protocolCodecPlugin);
    await app.register(errorHandlerPlugin);

    await app.register(createIdentityRoutes(identityService, clock), {
        prefix: "/openapi/service",
    });

    await app.register(infodeskRoutes, {
        prefix: "/infodesk",
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
