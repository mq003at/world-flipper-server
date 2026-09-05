import { unixSeconds } from "../../protocol/worldflipper/data-headers";
import { serializeClientDate } from "../../protocol/worldflipper/client-time";
import type { GrantedCharacter } from "../reward/reward.models";
import type { TutorialUpdateResult } from "./tutorial.models";
import type { GrantedTutorialCharacter } from "./tutorial.repository";

function presentRewardCharacter(granted: GrantedCharacter): Record<string, unknown> {
    const character = granted.character;
    const createTime = serializeClientDate(character.joinTime);

    // Match legacy givePlayerCharacterSync exactly for the tutorial gacha.
    // New characters deliberately use viewer_id: 0 in the old server.
    if (!granted.isNew) {
        return {
            character_id: granted.characterId,
            stack: character.stack,
            create_time: createTime,
            update_time: serializeClientDate(character.updateTime),
            join_time: createTime,
        };
    }

    return {
        viewer_id: 0,
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

function presentTutorialCharacter(
    granted: GrantedTutorialCharacter,
    viewerId: number,
): Record<string, unknown> {
    const character = granted.character;
    const timestamp = serializeClientDate(character.joinTime);

    if (!granted.isNew) {
        return {
            character_id: granted.characterId,
            stack: character.stack,
            create_time: timestamp,
            update_time: serializeClientDate(character.updateTime),
            join_time: timestamp,
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
        create_time: timestamp,
        update_time: serializeClientDate(character.updateTime),
        join_time: timestamp,
    };
}

export function presentTutorialUpdate(result: TutorialUpdateResult): Record<string, unknown> {
    if (result.kind === "gacha") {
        const duplicateItem = result.granted.duplicateItem;
        return {
            step: result.step,
            user_info: {
                free_vmoney: result.freeVmoney,
            },
            gacha: {
                draw: [
                    {
                        character_id: result.granted.characterId,
                        movie_id: result.movieId,
                        seed: result.seed,
                        entry_count: 1,
                        ...(duplicateItem === undefined
                            ? {}
                            : {
                                  ex_boost_item: {
                                      id: duplicateItem.id,
                                      count: duplicateItem.count,
                                  },
                              }),
                    },
                ],
                gacha_info_list: [
                    {
                        gacha_id: result.gachaId,
                        is_account_first: false,
                        is_daily_first: false,
                    },
                ],
            },
            character_list: [presentRewardCharacter(result.granted)],
            item_list: result.itemList,
            encyclopedia_info: [],
            mail_arrived: false,
            start_time: unixSeconds(result.now),
        };
    }

    if (result.kind === "free-character") {
        return {
            step: result.step,
            user_info: {
                free_vmoney: result.freeVmoney,
            },
            character_list: [presentTutorialCharacter(result.granted, result.viewerId)],
            encyclopedia_info: {
                [`1${result.granted.characterId}01`]: {
                    read: false,
                },
            },
            mail_arrived: true,
            start_time: unixSeconds(result.now),
        };
    }

    return {
        step: result.step,
        mail_arrived: true,
        start_time: unixSeconds(result.now),
    };
}
