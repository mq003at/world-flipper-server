import type { CharacterCatalog } from "../../content/master-data/character-catalog";
import type { Clock } from "../../infrastructure/clock/clock";
import { serializeClientDate } from "../../protocol/worldflipper/client-time";
import type { CharacterExpResult } from "./quest.models";
import type { QuestRepository } from "./quest.repository";

const CHARACTER_EXP_CAPS: Record<number, number[]> = {
    1: [11416, 15820, 21477, 28538, 37241, 49481, 66600, 91180, 125223, 170928, 216633, 262338, 308043],
    2: [21477, 28538, 37241, 49481, 66600, 91180, 125223, 170928, 216633, 262338, 308043],
    3: [37241, 49481, 66600, 91180, 125223, 170928, 216633, 262338, 308043],
    4: [76272, 102829, 139190, 189995, 240800, 291605, 342410],
    5: [153988, 210488, 266988, 323488, 379988],
};

const FIXED_PARTY_AFTER_EXP = 379_988;

export class CharacterExpService {
    constructor(
        private readonly repository: QuestRepository,
        private readonly characterCatalog: CharacterCatalog,
        private readonly clock: Clock,
    ) {}

    grant(
        playerId: number,
        characterIds: readonly number[],
        expAmount: number,
        ignoreUpdate: boolean,
    ): CharacterExpResult {
        const addExpList: CharacterExpResult["addExpList"] = [];
        const characterList: CharacterExpResult["characterList"] = [];
        const bondTokenStatusList: CharacterExpResult["bondTokenStatusList"] = {};
        let overflowExp = 0;

        for (const characterId of characterIds) {
            const character = this.repository.getCharacter(playerId, characterId);
            const definition = this.characterCatalog.findById(characterId);

            if (!character || !definition || ignoreUpdate) {
                addExpList.push({
                    character_id: characterId,
                    add_exp: 0,
                    after_exp: FIXED_PARTY_AFTER_EXP,
                    add_exp_pool: 0,
                });
                continue;
            }

            const expCap = CHARACTER_EXP_CAPS[definition.rarity]?.[character.overLimitStep]
                ?? Number.MAX_SAFE_INTEGER;
            const requestedAfter = character.exp + expAmount;
            const afterExp = Math.min(requestedAfter, expCap);
            const grantedExp = Math.max(0, afterExp - character.exp);
            const characterOverflow = Math.max(0, requestedAfter - expCap);
            overflowExp += characterOverflow;

            const now = this.clock.now();
            this.repository.updateCharacterExp(playerId, characterId, afterExp, now);

            addExpList.push({
                character_id: characterId,
                add_exp: grantedExp,
                after_exp: afterExp,
                add_exp_pool: characterOverflow,
            });
            characterList.push({
                character_id: characterId,
                exp: afterExp,
                create_time: serializeClientDate(character.joinTime),
                update_time: serializeClientDate(now),
                join_time: serializeClientDate(character.joinTime),
                exp_total: afterExp,
            });

            const bondStatuses = character.bondTokenList.map((token) => ({
                mana_board_index: token.manaBoardIndex,
                status: token.status,
            }));
            bondTokenStatusList[String(characterId)] = {
                before: bondStatuses,
                after: bondStatuses,
            };
        }

        if (overflowExp > 0) this.repository.addExpPool(playerId, overflowExp);
        return { addExpList, characterList, bondTokenStatusList, overflowExp };
    }
}
