import { serializeClientDate } from "../../protocol/worldflipper/client-time";
import type { GrantedCharacter, GrantedEquipment, RewardGrantResult } from "./reward.models";

export function presentGrantedCharacter(
    granted: GrantedCharacter,
    viewerId: number,
): Record<string, unknown> {
    const character = granted.character;
    const createTime = serializeClientDate(character.joinTime);

    if (!granted.isNew) {
        return {
            viewer_id: viewerId,
            character_id: granted.characterId,
            stack: character.stack,
            exp: character.exp,
            exp_total: character.exp,
            create_time: createTime,
            update_time: serializeClientDate(character.updateTime),
            join_time: createTime,
        };
    }

    return {
        viewer_id: viewerId,
        character_id: granted.characterId,
        entry_count: character.entryCount,
        exp: character.exp,
        exp_total: character.exp,
        bond_token_list: character.bondTokenList.map((token) => ({
            mana_board_index: token.manaBoardIndex,
            status: token.status,
        })),
        mana_board_index: character.manaBoardIndex,
        create_time: createTime,
        update_time: serializeClientDate(character.updateTime),
        join_time: createTime,
    };
}

export function presentGrantedEquipment(
    granted: GrantedEquipment,
    viewerId: number,
): Record<string, unknown> {
    return {
        null: 1,
        viewer_id: viewerId,
        equipment_id: granted.equipmentId,
        protection: granted.equipment.protection,
        level: granted.equipment.level,
        enhancement_level: granted.equipment.enhancementLevel,
        stack: granted.equipment.stack,
    };
}

/**
 * Compatibility shape used by quest/gacha/shop adapters in later batches.
 * Currency values are deltas, matching the old givePlayerRewardsSync contract.
 */
export function presentRewardGrant(
    result: RewardGrantResult,
    viewerId: number,
): Record<string, unknown> {
    return {
        user_info: {
            free_mana: result.deltas.freeMana,
            free_vmoney: result.deltas.freeVmoney,
            exp_pool: result.deltas.expPool,
        },
        character_list: result.characters.map((character) =>
            presentGrantedCharacter(character, viewerId),
        ),
        joined_character_id_list: [],
        equipment_list: result.equipment.map((equipment) =>
            presentGrantedEquipment(equipment, viewerId),
        ),
        items: result.items,
    };
}
