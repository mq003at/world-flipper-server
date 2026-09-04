import type { FastifyPluginAsync } from "fastify";
import type { Clock } from "../../../infrastructure/clock/clock";
import { createDataHeaders } from "../../../protocol/worldflipper/data-headers";
import { InvalidRequestError } from "../../../shared/errors/application-error";
import type { IdentityService } from "../../identity/identity.service";
export function createMultiBattleQuestRoutes(identity:IdentityService,clock:Clock):FastifyPluginAsync{return async(fastify)=>{fastify.post("/get_rooms",async(request,reply)=>{if(typeof request.body!=="object"||request.body===null||Array.isArray(request.body))throw new InvalidRequestError();const b=request.body as Record<string,unknown>;if(typeof b.viewer_id!=="number")throw new InvalidRequestError();identity.requireViewerSession(b.viewer_id);reply.header("content-type","application/x-msgpack");return{data_headers:createDataHeaders(clock,{viewer_id:b.viewer_id}),data:{rooms:[]}};});};}
