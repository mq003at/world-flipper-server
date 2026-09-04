import type { Clock } from "../../../infrastructure/clock/clock";
import type { IdentityService } from "../../identity/identity.service";
import type { PlayerService } from "../../player/player.service";
import type { EventRegistry } from "../event-registry/event.registry";
import type { RaidEventRepository } from "./raid-event.repository";
export class RaidEventService{
 constructor(private readonly identity:IdentityService,private readonly players:PlayerService,private readonly repository:RaidEventRepository,private readonly clock:Clock,private readonly events?:EventRegistry){}
 getBoss(viewerId:number,eventId:number){const s=this.identity.requireViewerSession(viewerId);this.players.requireForAccount(s.accountId);this.events?.assertNumericEventAvailable("raid",eventId,this.clock.now());return this.repository.getOrCreate(eventId);}
}
