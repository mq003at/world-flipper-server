import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../../infrastructure/clock/clock";
import { createDataHeaders } from "../../../protocol/worldflipper/data-headers";
import { InvalidRequestError } from "../../../shared/errors/application-error";
import type { RankingEventService } from "./ranking-event.service";
function parse(value:unknown){ if(typeof value!=="object"||value===null||Array.isArray(value)) throw new InvalidRequestError(); const b=value as Record<string,unknown>; if(typeof b.viewer_id!=="number"||typeof b.ranking_event_id!=="number") throw new InvalidRequestError(); return {viewerId:b.viewer_id,eventId:b.ranking_event_id}; }
export function createRankingEventRoutes(service:RankingEventService,clock:Clock):FastifyPluginAsync{return async(fastify)=>{
 fastify.post("/get_summary",async(request,reply)=>{const i=parse(request.body);reply.header("content-type","application/x-msgpack");return{data_headers:createDataHeaders(clock,{viewer_id:i.viewerId}),data:service.getSummary(i.viewerId,i.eventId)}});
 fastify.post("/receive_reward",async(request,reply)=>{const i=parse(request.body);reply.header("content-type","application/x-msgpack");return{data_headers:createDataHeaders(clock,{viewer_id:i.viewerId}),data:service.receiveReward(i.viewerId,i.eventId)}});
};}
