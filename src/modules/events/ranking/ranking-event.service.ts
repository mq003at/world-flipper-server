import { QuestCategory } from "../../../content/master-data/quest-catalog";
import type { Clock } from "../../../infrastructure/clock/clock";
import { InvalidRequestError } from "../../../shared/errors/application-error";
import type { IdentityService } from "../../identity/identity.service";
import type { PlayerService } from "../../player/player.service";
import type { QuestRepository } from "../../quest/quest.repository";
import type { EventRegistry } from "../event-registry/event.registry";
import type { RankingEventRepository } from "./ranking-event.repository";

const EVENT_QUEST: Record<number, number> = { 1:1001, 2:2001, 3:3001, 4:4001, 5:5001 };
const TOP_TIME_MS: Record<number, number> = { 1:54410, 2:25800, 3:18880, 4:31720, 5:6540 };

export class RankingEventService {
    constructor(
        private readonly identity: IdentityService,
        private readonly players: PlayerService,
        private readonly quests: QuestRepository,
        private readonly repository: RankingEventRepository,
        private readonly clock: Clock,
        private readonly events?: EventRegistry,
    ) {}

    getSummary(viewerId:number,eventId:number): Record<string,unknown> {
        const player=this.requirePlayer(viewerId); this.events?.assertNumericEventAvailable("ranking",eventId,this.clock.now());
        const questId=EVENT_QUEST[eventId]; if (questId === undefined) throw new InvalidRequestError("Invalid ranking event id.");
        const progress=this.quests.getQuestProgress(player.id,QuestCategory.RANKING_EVENT_SINGLE,questId);
        const accomplished=progress?.bestElapsedTimeMs !== undefined;
        const top=TOP_TIME_MS[eventId] ?? 0;
        return {
            best_record:{ elapsed_time_ms:accomplished ? progress?.bestElapsedTimeMs ?? 0 : 0, is_accomplished:accomplished, score:accomplished ? progress?.highScore ?? 0 : 0 },
            leader_character_evolution_img_level:1,
            leader_character_id:1,
            rank_border_top:{elapsed_time_ms:top,is_accomplished:true,score:1110111},
            rank_percentage: accomplished ? 1 - (top / Math.max(1,progress?.bestElapsedTimeMs ?? 1)) : 100,
        };
    }

    receiveReward(viewerId:number,eventId:number): Record<string,unknown> {
        const player=this.requirePlayer(viewerId); const summary=this.getSummary(viewerId,eventId);
        this.repository.markClaimed(player.id,eventId,this.clock.now());
        return {status:1,...summary};
    }

    private requirePlayer(viewerId:number) { const session=this.identity.requireViewerSession(viewerId); return this.players.requireForAccount(session.accountId); }
}
