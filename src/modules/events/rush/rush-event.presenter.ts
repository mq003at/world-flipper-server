import type { PlayerPartyGroup } from "../../player/player.models";
import type { RushRankingEntry, RushSummaryResult } from "./rush-event.models";

export function presentRushRanking(entry: RushRankingEntry | null): unknown {
    if (!entry) return null;
    return {
        best_round: entry.bestRound,
        elapsed_time_ms: entry.elapsedTimeMs,
        name: entry.name,
        party_member_list: entry.partyMembers.map((member) => ({ character_id: member.characterId, evolution_img_level: member.evolutionImgLevel })),
        rank_number: entry.rankNumber,
        user_rank: entry.userRank,
    };
}

export function presentRushSummary(summary: RushSummaryResult, aggregatedTime: string): Record<string, unknown> {
    return {
        endless_battle_next_round: summary.nextRound,
        active_rush_battle_folder_id: summary.activeFolderId,
        endless_battle_played_max_round: summary.nextRound,
        cleared_folder_id_list: summary.clearedFolderIds,
        endless_battle_played_party_list: summary.endlessParties,
        rush_battle_played_party_list: summary.folderParties,
        endless_battle_my_ranking: presentRushRanking(summary.myRanking),
        aggregated_time: aggregatedTime,
    };
}

export function presentRushPartyGroups(groups: Record<string, PlayerPartyGroup>): Array<Record<string, unknown>> {
    return Object.entries(groups).map(([groupId, group]) => ({
        party_group_color_id: group.colorId,
        party_group_id: Number(groupId),
        party_list: Object.entries(group.list).map(([partyId, party]) => ({
            ability_soul_ids: party.abilitySoulIds,
            character_ids: party.characterIds,
            equipment_ids: party.equipmentIds,
            options: { allow_other_players_to_heal_me: party.allowOtherPlayersToHealMe },
            party_edited: party.edited,
            party_id: Number(partyId),
            party_name: party.name,
            unison_character_ids: party.unisonCharacterIds,
        })),
    }));
}
