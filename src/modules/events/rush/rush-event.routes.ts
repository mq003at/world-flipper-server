import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../../infrastructure/clock/clock";
import { createDataHeaders } from "../../../protocol/worldflipper/data-headers";
import { serializeClientDate } from "../../../protocol/worldflipper/client-time";
import { parseRushBattleStart, parseRushParty, parseRushRanking, parseRushRankingPlayedParty, parseRushReset, parseRushSelectFolder, parseRushSummary } from "./rush-event.contracts";
import { presentRushPartyGroups, presentRushRanking, presentRushSummary } from "./rush-event.presenter";
import type { RushEventService } from "./rush-event.service";

export function createRushEventRoutes(service: RushEventService, clock: Clock): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post("/summary", async (request, reply) => { const input=parseRushSummary(request.body); const result=service.summary(input.viewerId,input.eventId); reply.header("content-type","application/x-msgpack"); return { data_headers:createDataHeaders(clock,{viewer_id:input.viewerId}), data:presentRushSummary(result,serializeClientDate(clock.now())) }; });
        fastify.post("/select_folder", async (request, reply) => { const input=parseRushSelectFolder(request.body); service.selectFolder(input.viewerId,input.eventId,input.folderId); reply.header("content-type","application/x-msgpack"); return { data_headers:createDataHeaders(clock,{viewer_id:input.viewerId}), data:{folder_id:input.folderId,event_id:input.eventId} }; });
        fastify.post("/ranking", async (request, reply) => { const input=parseRushRanking(request.body); const result=service.ranking(input.viewerId,input.eventId,input.page); reply.header("content-type","application/x-msgpack"); return { data_headers:createDataHeaders(clock,{viewer_id:input.viewerId}), data:{aggregated_time:serializeClientDate(clock.now()),current_page:input.page+1,page_max:result.pageMax,my_data:presentRushRanking(result.myData),ranking_list:result.list.map(presentRushRanking)} }; });
        fastify.post("/ranking/played_party", async (request, reply) => { const input=parseRushRankingPlayedParty(request.body); const party=service.rankingPlayedParty(input.viewerId,input.eventId,input.rankNumber); reply.header("content-type","application/x-msgpack"); return { data_headers:createDataHeaders(clock,{viewer_id:input.viewerId}), data:{rush_ranking_party:party} }; });
        fastify.post("/aggregated_time", async (request, reply) => { const input=parseRushSummary(request.body); const time=service.aggregatedTime(input.viewerId,input.eventId); reply.header("content-type","application/x-msgpack"); return { data_headers:createDataHeaders(clock,{viewer_id:input.viewerId}), data:{aggregated_time:time} }; });
        fastify.post("/party", async (request, reply) => { const input=parseRushParty(request.body); const groups=service.party(input.viewerId); reply.header("content-type","application/x-msgpack"); return { data_headers:createDataHeaders(clock,{viewer_id:input.viewerId}), data:{user_party_group_list:presentRushPartyGroups(groups)} }; });
        fastify.post("/battle/start", async (request, reply) => { const input=parseRushBattleStart(request.body); service.battleStart(input); const headers=createDataHeaders(clock,{viewer_id:input.viewerId}); reply.header("content-type","application/x-msgpack"); return { data_headers:headers, data:{user_info:{last_main_quest_id:input.questId},is_multi:"single",start_time:headers.servertime,quest_name:""} }; });
        fastify.post("/reset", async (request, reply) => { const input=parseRushReset(request.body); service.reset(input); reply.header("content-type","application/x-msgpack"); return { data_headers:createDataHeaders(clock,{viewer_id:input.viewerId}), data:[] }; });
    };
}
