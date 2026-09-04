import { QuestCategory } from "../../../content/master-data/quest-catalog";
import type { Clock } from "../../../infrastructure/clock/clock";
import { serializeClientDate } from "../../../protocol/worldflipper/client-time";
import { InvalidRequestError } from "../../../shared/errors/application-error";
import type { EventRegistry } from "../event-registry/event.registry";
import type { IdentityService } from "../../identity/identity.service";
import type { PlayerService } from "../../player/player.service";
import type { QuestService } from "../../quest/quest.service";
import type { RushEventCatalog } from "./rush-event.catalog";
import { RushEventBattleType, type RushPlayedParty, type RushSummaryResult } from "./rush-event.models";
import type { RushEventRepository } from "./rush-event.repository";

function serializeParty(party: RushPlayedParty): Record<string, number | null> {
    return {
        character_id_1: party.characterIds[0] ?? null, character_id_2: party.characterIds[1] ?? null, character_id_3: party.characterIds[2] ?? null,
        unison_character_id_1: party.unisonCharacterIds[0] ?? null, unison_character_id_2: party.unisonCharacterIds[1] ?? null, unison_character_id_3: party.unisonCharacterIds[2] ?? null,
        equipment_id_1: party.equipmentIds[0] ?? null, equipment_id_2: party.equipmentIds[1] ?? null, equipment_id_3: party.equipmentIds[2] ?? null,
        ability_soul_id_1: party.abilitySoulIds[0] ?? null, ability_soul_id_2: party.abilitySoulIds[1] ?? null, ability_soul_id_3: party.abilitySoulIds[2] ?? null,
        evolution_img_level_1: party.evolutionLevels[0] ?? null, evolution_img_level_2: party.evolutionLevels[1] ?? null, evolution_img_level_3: party.evolutionLevels[2] ?? null,
        unison_evolution_img_level_1: party.unisonEvolutionLevels[0] ?? null, unison_evolution_img_level_2: party.unisonEvolutionLevels[1] ?? null, unison_evolution_img_level_3: party.unisonEvolutionLevels[2] ?? null,
    };
}
function bucket(parties: RushPlayedParty[], type: RushEventBattleType) {
    const result: Record<string, Record<string, number | null>> = {};
    for (const party of parties) if (party.battleType === type) result[String(party.round)] = serializeParty(party);
    return result;
}

export class RushEventService {
    constructor(
        private readonly identity: IdentityService,
        private readonly players: PlayerService,
        private readonly repository: RushEventRepository,
        private readonly catalog: RushEventCatalog,
        private readonly quests: QuestService,
        private readonly clock: Clock,
        private readonly events?: EventRegistry,
    ) {}

    summary(viewerId: number, eventId: number): RushSummaryResult {
        const player = this.requirePlayer(viewerId);
        this.assertAvailable(eventId);
        const state = this.repository.findState(player.id, eventId) ?? this.repository.createState(player.id, eventId);
        const parties = this.repository.listPlayedParties(player.id, eventId);
        return {
            eventId,
            nextRound: this.repository.nextEndlessRound(player.id, eventId),
            activeFolderId: state.activeFolderId,
            clearedFolderIds: this.repository.listClearedFolders(player.id, eventId),
            folderParties: bucket(parties, RushEventBattleType.FOLDER),
            endlessParties: bucket(parties, RushEventBattleType.ENDLESS),
            myRanking: this.repository.rankingForPlayer(player.id, eventId),
        };
    }

    selectFolder(viewerId: number, eventId: number, folderId: number): void {
        const player = this.requirePlayer(viewerId); this.assertAvailable(eventId);
        if (!this.catalog.findFolder(eventId, folderId)) throw new InvalidRequestError("Invalid rush event folder.");
        const state = this.repository.findState(player.id, eventId) ?? this.repository.createState(player.id, eventId);
        if (state.activeFolderId !== null) throw new InvalidRequestError("Already selected a folder for this rush event.");
        this.repository.setActiveFolder(player.id, eventId, folderId);
    }

    ranking(viewerId: number, eventId: number, page: number) {
        this.requirePlayer(viewerId); this.assertAvailable(eventId);
        const player = this.requirePlayer(viewerId);
        return { myData: this.repository.rankingForPlayer(player.id,eventId), ...this.repository.rankingPage(eventId, Math.max(0,page)) };
    }

    rankingPlayedParty(viewerId: number, eventId: number, rankNumber: number) {
        this.requirePlayer(viewerId); this.assertAvailable(eventId);
        const target = this.repository.playerIdAtRank(eventId, rankNumber);
        if (target === null) return {};
        return bucket(this.repository.listPlayedParties(target, eventId), RushEventBattleType.ENDLESS);
    }

    party(viewerId: number) {
        const player = this.requirePlayer(viewerId);
        return this.repository.transaction(() => this.repository.ensureEventPartyGroups(player.id));
    }

    battleStart(input: { viewerId:number;questId:number;partyId:number;playId:string;isAutoStartMode:boolean }) {
        const mapping = this.catalog.findQuest(input.questId);
        if (!mapping) throw new InvalidRequestError("Quest doesn't exist.");
        this.assertAvailable(mapping.eventId);
        return this.quests.start({
            viewerId: input.viewerId, questId: input.questId, category: QuestCategory.RUSH_EVENT,
            partyId: input.partyId, playId: input.playId, isAutoStartMode: input.isAutoStartMode,
            useBoostPoint: false, useBossBoostPoint: false,
        });
    }

    reset(input: { viewerId:number;eventId:number;questType:number;resetTargetId?:number;isResetAfterTargetRound?:boolean }): void {
        const player=this.requirePlayer(input.viewerId); this.assertAvailable(input.eventId);
        if (input.questType === 1) {
            if (input.resetTargetId !== undefined) this.repository.deletePlayedPartiesFrom(player.id,input.eventId,RushEventBattleType.FOLDER,input.resetTargetId);
            else { this.repository.setActiveFolder(player.id,input.eventId,null); this.repository.deletePlayedParties(player.id,input.eventId,RushEventBattleType.FOLDER); }
        } else if (input.resetTargetId !== undefined) {
            if (input.isResetAfterTargetRound) this.repository.deletePlayedPartiesFrom(player.id,input.eventId,RushEventBattleType.ENDLESS,input.resetTargetId);
            else this.repository.deletePlayedParty(player.id,input.eventId,RushEventBattleType.ENDLESS,input.resetTargetId);
        }
    }

    aggregatedTime(viewerId:number,eventId:number): string { this.requirePlayer(viewerId); this.assertAvailable(eventId); return serializeClientDate(this.clock.now()); }

    private requirePlayer(viewerId:number) { const session=this.identity.requireViewerSession(viewerId); return this.players.requireForAccount(session.accountId); }
    private assertAvailable(eventId:number): void { this.events?.assertNumericEventAvailable("rush",eventId,this.clock.now()); }
}
