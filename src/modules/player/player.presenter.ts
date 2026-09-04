import { unixSeconds } from "../../protocol/worldflipper/data-headers";
import type { PlayerPartyGroup, PlayerSnapshot } from "./player.models";

export interface PresentPlayerOptions {
    viewerId: number;
    availableAssetVersion: string;
}

function clientSerializeDate(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
        date.getUTCDate(),
    ).padStart(2, "0")} ${String(date.getUTCHours()).padStart(2, "0")}:${String(
        date.getUTCMinutes(),
    ).padStart(2, "0")}:${String(date.getUTCSeconds()).padStart(2, "0")}`;
}

function presentPartyGroups(groups: Record<string, PlayerPartyGroup>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [groupId, group] of Object.entries(groups)) {
        const list: Record<string, unknown> = {};
        for (const [partyId, party] of Object.entries(group.list)) {
            list[partyId] = {
                name: party.name,
                character_ids: party.characterIds,
                unison_character_ids: party.unisonCharacterIds,
                equipment_ids: party.equipmentIds,
                ability_soul_ids: party.abilitySoulIds,
                edited: party.edited,
                options: {
                    allow_other_players_to_heal_me: party.allowOtherPlayersToHealMe,
                },
            };
        }

        result[groupId] = {
            list,
            color_id: group.colorId,
        };
    }

    return result;
}

const PURCHASED_TIMES_LIST = {
    "gs.kg.worldflipper.pakage_monthly": 0,
    "gs.kg.worldflipper.pakage_rank": 0,
    "gs.kg.worldflipper.pakage_monthly_90": 0,
    "gs.kg.worldflipper.pakage_monthly_stamina": 0,
    "gs.kg.worldflipper.pakage_monthly_kareido": 0,
    "gs.kg.worldflipper.pakage_monthly_boss": 0,
    "gs.kg.worldflipper.pakage_rank_2": 0,
    "gs.kg.worldflipper.pakage_rank_3_1": 0,
    "gs.kg.worldflipper.pakage_rank_4": 0,
    "gs.kg.worldflipper.pakage_challenge_boost": 0,
};

const CLIENT_CONFIG = {
    attention_recruitment_interval_seconds: 15,
    attention_recruitment_redeliver_limit: 20,
    attention_polling_interval_seconds_normal: 10,
    attention_polling_interval_seconds_battle: 15,
    multi_attention_lifetime_seconds: 30,
    contribution_score_rate_to_parasite: 0.25,
    attention_log_interval_seconds: 600,
    disable_finish_duration_seconds: 5,
    disable_decline_count_seconds: 60,
    disable_decline_count_limit: 14,
    disable_decline_duration_seconds: 30,
    disable_intent_disconnect_duration_seconds: 300,
    disable_unintent_disconnect_duration_seconds: 5,
    disable_remote_error_duration_seconds: 300,
    attention_animation_time_seconds: 6,
    disable_expire_count_limit: 4,
    disable_expire_duration_seconds: 180,
    polling_delay_normal_seconds_range_min: 1,
    polling_delay_normal_seconds_range_max: 10,
    polling_delay_battle_seconds_range_min: 1,
    polling_delay_battle_seconds_range_max: 15,
    return_attention_max_num: 3,
};

export function presentPlayerSnapshot(
    snapshot: PlayerSnapshot,
    options: PresentPlayerOptions,
): Record<string, unknown> {
    const player = snapshot.player;

    const userCharacterList: Record<string, unknown> = {};
    for (const [characterId, character] of Object.entries(snapshot.characterList)) {
        const payload: Record<string, unknown> = {
            entry_count: character.entryCount,
            evolution_level: character.evolutionLevel,
            over_limit_step: character.overLimitStep,
            protection: character.protection,
            join_time: unixSeconds(character.joinTime),
            update_time: unixSeconds(character.updateTime),
            exp: character.exp,
            stack: character.stack,
            bond_token_list: character.bondTokenList.map((token) => ({
                mana_board_index: token.manaBoardIndex,
                status: token.status,
            })),
            mana_board_index: character.manaBoardIndex,
        };

        if (character.exBoost) {
            payload.ex_boost = {
                status_id: character.exBoost.statusId,
                ability_id_list: character.exBoost.abilityIdList,
            };
        }
        if (character.illustrationSettings !== undefined) {
            payload.illustration_settings = character.illustrationSettings;
        }

        userCharacterList[characterId] = payload;
    }

    const userEquipmentList: Record<string, unknown> = {};
    for (const [equipmentId, equipment] of Object.entries(snapshot.equipmentList)) {
        userEquipmentList[equipmentId] = {
            enhancement_level: equipment.enhancementLevel,
            level: equipment.level,
            protection: equipment.protection,
            stack: equipment.stack,
        };
    }

    const questProgress: Record<string, unknown> = {};
    for (const [section, list] of Object.entries(snapshot.questProgress)) {
        questProgress[section] = list.map((progress) => ({
            best_elapsed_time_ms: progress.bestElapsedTimeMs,
            clear_rank: progress.clearRank,
            finished: progress.finished,
            high_score: progress.highScore,
            quest_id: progress.questId,
        }));
    }

    const boxGachaList: Record<string, unknown> = {};
    for (const [gachaId, boxes] of Object.entries(snapshot.boxGachaList)) {
        boxGachaList[gachaId] = boxes.map((box) => ({
            box_id: box.boxId,
            reset_times: box.resetTimes,
            remaining_number: box.remainingNumber,
            is_closed: box.isClosed,
        }));
    }

    let userTutorial: Record<string, unknown> | null = null;
    if (
        player.tutorialStep !== null &&
        !snapshot.triggeredTutorial.includes(12)
    ) {
        userTutorial = {
            viewer_id: options.viewerId,
            tutorial_step: player.tutorialStep,
            skip_flag: player.tutorialSkipFlag,
        };

        if (player.tutorialStep >= 1) {
            userTutorial.powerflip_failure = 0;
        }
    }

    return {
        user_info: {
            stamina: player.stamina,
            stamina_heal_time: unixSeconds(player.staminaHealTime),
            boost_point: player.boostPoint,
            boss_boost_point: player.bossBoostPoint,
            transition_state: player.transitionState,
            role: player.role,
            name: player.name,
            last_login_time: clientSerializeDate(player.lastLoginTime),
            comment: player.comment,
            vmoney: player.vmoney,
            free_vmoney: player.freeVmoney,
            rank_point: player.rankPoint,
            star_crumb: player.starCrumb,
            bond_token: player.bondToken,
            exp_pool: player.expPool,
            exp_pooled_time: unixSeconds(player.expPooledTime),
            leader_character_id: player.leaderCharacterId,
            party_slot: player.partySlot,
            degree_id: player.degreeId,
            birth: player.birth,
            free_mana: player.freeMana,
            paid_mana: player.paidMana,
            enable_auto_3x: player.enableAuto3x,
        },
        premium_bonus_list: [],
        expired_premium_bonus_list: null,
        user_daily_challenge_point_list: snapshot.dailyChallengePointList.map((entry) => ({
            id: entry.id,
            point: entry.point,
            campaign_list: entry.campaignList.map((campaign) => ({
                campaign_id: campaign.campaignId,
                additional_point: campaign.additionalPoint,
            })),
        })),
        bonus_index_list: null,
        login_bonus_received_at: null,
        user_notice_list: [],
        user_triggered_tutorial: snapshot.triggeredTutorial,
        user_tutorial: userTutorial,
        tutorial_gacha: null,
        cleared_regular_mission_list: snapshot.clearedRegularMissionList,
        user_character_list: userCharacterList,
        user_character_mana_node_list: snapshot.characterManaNodeList,
        user_party_group_list: presentPartyGroups(snapshot.partyGroupList),
        item_list: snapshot.itemList,
        user_equipment_list: userEquipmentList,
        user_character_from_town_history: [],
        quest_progress: questProgress,
        last_main_quest_id: null,
        gacha_info_list: snapshot.gachaInfoList.map((info) => ({
            gacha_id: info.gachaId,
            is_daily_first: info.isDailyFirst,
            is_account_first: info.isAccountFirst,
            gacha_exchange_point: info.gachaExchangePoint,
        })),
        available_asset_version: options.availableAssetVersion,
        should_prompt_takeover_registration: false,
        has_unread_news_item: false,
        user_option: snapshot.userOption,
        drawn_quest_list: snapshot.drawnQuestList.map((quest) => ({
            category_id: quest.categoryId,
            quest_id: quest.questId,
            odds_id: quest.oddsId,
        })),
        mail_arrived: false,
        user_periodic_reward_point_list: snapshot.periodicRewardPointList,
        all_active_mission_list: snapshot.allActiveMissionList,
        cleared_collect_item_event_mission_list: [],
        box_gacha_list: boxGachaList,
        gacha_campaign_list: snapshot.gachaCampaignList.map((campaign) => ({
            gacha_id: campaign.gachaId,
            campaign_id: campaign.campaignId,
            count: campaign.count,
        })),
        purchased_times_list: PURCHASED_TIMES_LIST,
        start_dash_exchange_campaign_list: snapshot.startDashExchangeCampaignList.map((campaign) => ({
            campaign_id: campaign.campaignId,
            gacha_id: campaign.gachaId,
            period_start_time: unixSeconds(campaign.periodStartTime),
            period_end_time: unixSeconds(campaign.periodEndTime),
            status: campaign.status,
            term_index: campaign.termIndex,
        })),
        multi_special_exchange_campaign_list: snapshot.multiSpecialExchangeCampaignList.map(
            (campaign) => ({
                campaign_id: campaign.campaignId,
                status: campaign.status,
            }),
        ),
        associate_token: "associate_token",
        config: CLIENT_CONFIG,
    };
}
