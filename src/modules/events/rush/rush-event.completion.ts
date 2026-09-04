import { QuestCategory } from "../../../content/master-data/quest-catalog";
import type { QuestFinishExtension, QuestFinishExtensionContext, QuestFinishExtensionResult } from "../../quest/quest-finish.extension";
import type { RewardService } from "../../reward/reward.service";
import type { RushEventCatalog } from "./rush-event.catalog";
import { RushEventBattleType, type RushPlayedParty } from "./rush-event.models";
import type { RushEventRepository } from "./rush-event.repository";

function serializeParty(party: RushPlayedParty): Record<string, number | null> {
    return {
        character_id_1: party.characterIds[0] ?? null,
        character_id_2: party.characterIds[1] ?? null,
        character_id_3: party.characterIds[2] ?? null,
        unison_character_id_1: party.unisonCharacterIds[0] ?? null,
        unison_character_id_2: party.unisonCharacterIds[1] ?? null,
        unison_character_id_3: party.unisonCharacterIds[2] ?? null,
        equipment_id_1: party.equipmentIds[0] ?? null,
        equipment_id_2: party.equipmentIds[1] ?? null,
        equipment_id_3: party.equipmentIds[2] ?? null,
        ability_soul_id_1: party.abilitySoulIds[0] ?? null,
        ability_soul_id_2: party.abilitySoulIds[1] ?? null,
        ability_soul_id_3: party.abilitySoulIds[2] ?? null,
        evolution_img_level_1: party.evolutionLevels[0] ?? null,
        evolution_img_level_2: party.evolutionLevels[1] ?? null,
        evolution_img_level_3: party.evolutionLevels[2] ?? null,
        unison_evolution_img_level_1: party.unisonEvolutionLevels[0] ?? null,
        unison_evolution_img_level_2: party.unisonEvolutionLevels[1] ?? null,
        unison_evolution_img_level_3: party.unisonEvolutionLevels[2] ?? null,
    };
}

function bucket(parties: RushPlayedParty[], type: RushEventBattleType): Record<string, Record<string, number | null>> {
    const result: Record<string, Record<string, number | null>> = {};
    for (const party of parties) if (party.battleType === type) result[String(party.round)] = serializeParty(party);
    return result;
}

export class RushQuestFinishExtension implements QuestFinishExtension {
    constructor(
        private readonly repository: RushEventRepository,
        private readonly catalog: RushEventCatalog,
        private readonly rewards: RewardService,
    ) {}

    afterCoreFinish(context: QuestFinishExtensionContext): QuestFinishExtensionResult | null {
        if (context.category !== QuestCategory.RUSH_EVENT || !context.isAccomplished) return null;
        const mapping = this.catalog.findQuest(context.questId);
        if (!mapping) return null;
        const state = this.repository.findState(context.playerId, mapping.eventId)
            ?? this.repository.createState(context.playerId, mapping.eventId);
        const battleType = mapping.round === 0 ? RushEventBattleType.ENDLESS : RushEventBattleType.FOLDER;
        const characterIds = context.statistics.characters.slice(0, 3);
        while (characterIds.length < 3) characterIds.push(null);
        const unisonIds = context.statistics.unisonCharacters.slice(0, 3);
        while (unisonIds.length < 3) unisonIds.push(null);
        const equipmentIds = context.statistics.equipmentIds.slice(0, 3);
        while (equipmentIds.length < 3) equipmentIds.push(null);
        const soulIds = context.statistics.abilitySoulIds.slice(0, 3);
        while (soulIds.length < 3) soulIds.push(null);
        const evolutionLevels = this.repository.getCharacterEvolutionLevels(context.playerId, characterIds);
        const unisonEvolutionLevels = this.repository.getCharacterEvolutionLevels(context.playerId, unisonIds);
        const round = battleType === RushEventBattleType.ENDLESS
            ? this.repository.nextEndlessRound(context.playerId, mapping.eventId)
            : mapping.round;

        if (battleType === RushEventBattleType.ENDLESS) {
            const better = state.endlessMaxRound === null
                || round > state.endlessMaxRound
                || (round === state.endlessMaxRound
                    && (state.endlessMaxRoundTime === null || context.elapsedTimeMs <= state.endlessMaxRoundTime));
            if (better) this.repository.updateEndlessBest(
                context.playerId, mapping.eventId, round, context.elapsedTimeMs, characterIds, evolutionLevels,
            );
        }

        let grant = null;
        let rewardList: Array<{ kind: number; kindId: number; number: number }> = [];
        if (battleType === RushEventBattleType.FOLDER) {
            const folder = this.catalog.findFolder(mapping.eventId, mapping.folderId);
            if (folder && mapping.round >= folder.maxRound) {
                this.repository.markFolderCleared(context.playerId, mapping.eventId, mapping.folderId);
                this.repository.setActiveFolder(context.playerId, mapping.eventId, null);
                // Legacy clears the previous folder-round history first, then inserts
                // the just-finished final round so the client can still display it.
                this.repository.deletePlayedParties(context.playerId, mapping.eventId, RushEventBattleType.FOLDER);
                grant = folder.rewards.length > 0 ? this.rewards.grant(context.playerId, [...folder.rewards]) : null;
                rewardList = folder.rewards.flatMap((reward) => "id" in reward
                    ? [{ kind: 1, kindId: reward.id, number: "count" in reward ? reward.count : 1 }]
                    : []);
            }
        }

        this.repository.insertPlayedParty({
            playerId: context.playerId,
            eventId: mapping.eventId,
            round,
            battleType,
            characterIds,
            unisonCharacterIds: unisonIds,
            equipmentIds,
            abilitySoulIds: soulIds,
            evolutionLevels,
            unisonEvolutionLevels,
        });

        const parties = this.repository.listPlayedParties(context.playerId, mapping.eventId);
        return {
            grant,
            rushEvent: {
                rush_battle_reward_list: rewardList,
                rush_battle_played_party_list: bucket(parties, RushEventBattleType.FOLDER),
                endless_battle_played_party_list: bucket(parties, RushEventBattleType.ENDLESS),
                is_out_of_period: false,
            },
        };
    }
}
