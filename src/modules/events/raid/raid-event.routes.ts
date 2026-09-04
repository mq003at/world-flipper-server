import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../../infrastructure/clock/clock";
import { createDataHeaders } from "../../../protocol/worldflipper/data-headers";
import { InvalidRequestError } from "../../../shared/errors/application-error";
import type { RaidEventService } from "./raid-event.service";
export function createRaidEventRoutes(service:RaidEventService,clock:Clock):FastifyPluginAsync{return async(fastify)=>{fastify.post("/get_boss",async(request,reply)=>{if(typeof request.body!=="object"||request.body===null||Array.isArray(request.body))throw new InvalidRequestError();const b=request.body as Record<string,unknown>;if(typeof b.viewer_id!=="number"||typeof b.event_id!=="number")throw new InvalidRequestError();const boss=service.getBoss(b.viewer_id,b.event_id);reply.header("content-type","application/x-msgpack");return{data_headers:createDataHeaders(clock,{viewer_id:b.viewer_id}),data:{raid_boss:{hp_percentage:boss.hpPercentage,total_kill_count:boss.totalKillCount}}};});};}
