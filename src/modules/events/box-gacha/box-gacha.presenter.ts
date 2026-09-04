import { unixSeconds } from "../../../protocol/worldflipper/data-headers";
import { presentGrantedCharacter, presentGrantedEquipment } from "../../reward/reward.presenter";
import type { BoxExecResult, BoxInfoView } from "./box-gacha.models";

export function presentBoxInfo(box: BoxInfoView): Record<string, unknown> {
    return {
        box_id: box.boxId,
        reset_times: box.resetTimes,
        all_drawn_reward_list: box.drawnRewards.map((reward) => ({
            reward_id: reward.rewardId,
            number: reward.number,
        })),
        coming_next_reward_list: [],
        is_closed: box.isClosed,
    };
}

export function presentBoxExec(result: BoxExecResult): Record<string, unknown> {
    const characters = new Map<number, ReturnType<typeof presentGrantedCharacter>>();
    for (const granted of result.grant.characters) {
        characters.set(granted.characterId, presentGrantedCharacter(granted, result.viewerId));
    }
    const equipment = new Map<number, ReturnType<typeof presentGrantedEquipment>>();
    for (const granted of result.grant.equipment) {
        equipment.set(granted.equipmentId, presentGrantedEquipment(granted, result.viewerId));
    }
    const itemList: Record<string, number> = {
        [String(result.pullCurrencyId)]: result.pullCurrencyAmount,
        ...result.grant.items,
    };
    return {
        user_info: {
            free_mana: result.player.freeMana,
            exp_pool: result.player.expPool,
            exp_pooled_time: unixSeconds(result.player.expPooledTime),
        },
        drawn_reward_list: result.drawnRewards.map((reward) => ({
            reward_id: reward.rewardId,
            number: reward.number,
        })),
        all_box_info: result.allBoxInfo.map(presentBoxInfo),
        joined_character_id_list: [],
        character_list: [...characters.values()],
        equipment_list: [...equipment.values()],
        item_list: itemList,
        mail_arrived: false,
    };
}
