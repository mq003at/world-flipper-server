import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "../../protocol/worldflipper/data-headers";
import { InvalidRequestError } from "../../shared/errors/application-error";
import type { IdentityService } from "../identity/identity.service";
import type { PlayerService } from "../player/player.service";
import { parsePlayerDataExportRequest, parsePlayerDataImportRequest } from "./player-data.contracts";
import { presentPlayerExport, presentPlayerImport } from "./player-data.presenter";
import type { PlayerDataService } from "./player-data.service";

export interface PlayerDataRouteOptions {
    importEnabled: boolean;
}

export function createPlayerDataRoutes(
    service: PlayerDataService,
    identity: IdentityService,
    players: PlayerService,
    clock: Clock,
    options: PlayerDataRouteOptions,
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/export", async (request, reply) => {
            const input = parsePlayerDataExportRequest(request.body);
            const session = identity.requireViewerSession(input.viewerId);
            const player = players.requireForAccount(session.accountId);
            const save = service.exportPlayer(player.id);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: presentPlayerExport(save),
            };
        });

        fastify.post("/import", async (request, reply) => {
            if (!options.importEnabled) {
                throw new InvalidRequestError(
                    "Player-save import is disabled. Set PLAYER_DATA_IMPORT_ENABLED=true for a trusted server.",
                );
            }
            const input = parsePlayerDataImportRequest(request.body);
            const session = identity.requireViewerSession(input.viewerId);
            const player = players.requireForAccount(session.accountId);
            const result = service.importPlayer(player.id, input.save);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: presentPlayerImport(result),
            };
        });
    };
}
