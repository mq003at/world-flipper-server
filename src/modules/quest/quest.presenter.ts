import { unixSeconds } from "../../protocol/worldflipper/data-headers";
import { presentGrantedCharacter, presentGrantedEquipment } from "../reward/reward.presenter";
import type { RewardGrantResult } from "../reward/reward.models";
import type { BattleFinishResult, StoryFinishResult } from "./quest.models";

function mergeItems(...grants: Array<RewardGrantResult | null>): Record<string, number> {
    const result: Record<string, number> = {};
    for (const grant of grants) {
        if (!grant) continue;
        Object.assign(result, grant.items);
    }
    return result;
}

function presentCharacters(
    viewerId: number,
    ...grants: Array<RewardGrantResult | null>
): Record<string, unknown>[] {
    return grants.flatMap((grant) =>
        grant?.characters.map((entry) => presentGrantedCharacter(entry, viewerId)) ?? [],
    );
}

function presentEquipment(
    viewerId: number,
    ...grants: Array<RewardGrantResult | null>
): Record<string, unknown>[] {
    return grants.flatMap((grant) =>
        grant?.equipment.map((entry) => presentGrantedEquipment(entry, viewerId)) ?? [],
    );
}

export function presentStoryFinish(result: StoryFinishResult): unknown {
    if (result.alreadyFinished) return [];
    const grant = result.grant;
    return {
        user_info: {
            free_vmoney: result.player.freeVmoney,
            free_mana: result.player.freeMana,
        },
        character_list: presentCharacters(result.viewerId, grant),
        joined_character_id_list: [],
        equipment_list: presentEquipment(result.viewerId, grant),
        items: grant?.items ?? {},
    };
}

export function presentBattleFinish(result: BattleFinishResult): Record<string, unknown> {
    const scoreGrant = result.scoreRewards.grant;
    const grants = [result.clearGrant, result.sPlusGrant, scoreGrant];
    return {
        user_info: {
            free_mana: result.player.freeMana,
            exp_pool: result.player.expPool,
            exp_pooled_time: unixSeconds(result.player.expPooledTime),
            free_vmoney: result.player.freeVmoney,
            rank_point: result.player.rankPoint,
            stamina: result.player.stamina,
            stamina_heal_time: unixSeconds(result.player.staminaHealTime),
            boost_point: result.player.boostPoint,
            boss_boost_point: result.player.bossBoostPoint,
        },
        add_exp_list: result.characterExp.addExpList,
        character_list: [
            ...result.characterExp.characterList,
            ...presentCharacters(result.viewerId, ...grants),
        ],
        bond_token_status_list: result.characterExp.bondTokenStatusList,
        rewards: {
            overflow_pool_exp: result.characterExp.overflowExp,
            converted_pool_exp: 0,
            reward_pool_exp: result.questPoolExpReward,
            reward_mana: result.questManaReward,
            field_mana: result.fieldMana,
        },
        old_high_score: result.oldHighScore,
        joined_character_id_list: [],
        before_rank_point: result.beforeRankPoint,
        clear_rank: result.clearRank,
        drop_score_reward_ids: result.scoreRewards.dropScoreRewardIds,
        drop_rare_reward_ids: result.scoreRewards.dropRareRewardIds,
        drop_additional_reward_ids: [],
        drop_periodic_reward_ids: [],
        equipment_list: presentEquipment(result.viewerId, ...grants),
        category_id: result.category,
        is_multi: "single",
        quest_name: "",
        item_list: mergeItems(...grants),
        rush_event: null,
    };
}
