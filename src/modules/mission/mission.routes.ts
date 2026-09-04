import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "../../protocol/worldflipper/data-headers";
import { parseClaimMission, parseGetMissionProgress, parseUpdateMissionProgress } from "./mission.contracts";
import { presentMission, presentMissionGrant } from "./mission.presenter";
import type { MissionService } from "./mission.service";

function periodsFromCategories(categories: number[]): string[] | undefined {
    if (categories.length === 0) return undefined;
    return categories.flatMap((category) => {
        if (category === 1) return ["daily"];
        if (category === 2) return ["weekly"];
        if (category === 3) return ["regular"];
        return [];
    });
}

export function createMissionRoutes(service: MissionService, clock: Clock): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/get_mission_progress", async (request, reply) => {
            const input = parseGetMissionProgress(request.body);
            const missions = service.getProgress(input.viewerId, periodsFromCategories(input.categories));
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: {
                    mission_progress_list: missions.map(presentMission),
                    mail_arrived: false,
                },
            };
        });

        // Legacy clients submit mission_pattern/progress_value here. The new server deliberately
        // does not trust client-authored progress; authoritative gameplay hooks update missions.
        fastify.post("/update_mission_progress", async (request, reply) => {
            const input = parseUpdateMissionProgress(request.body);
            const missions = service.getProgress(input.viewerId);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: {
                    mission_info: missions.map(presentMission),
                    degree_list: [],
                    mail_arrived: false,
                },
            };
        });

        // Fan-server extension until the original reward-claim contract is captured.
        fastify.post("/claim", async (request, reply) => {
            const input = parseClaimMission(request.body);
            const result = service.claim(input.viewerId, input.missionId);
            reply.header("content-type", "application/x-msgpack");
            return {
                data_headers: createDataHeaders(clock, { viewer_id: input.viewerId }),
                data: {
                    mission_info: presentMission(result.mission),
                    ...presentMissionGrant(input.viewerId, result.grant),
                    mail_arrived: false,
                },
            };
        });
    };
}
