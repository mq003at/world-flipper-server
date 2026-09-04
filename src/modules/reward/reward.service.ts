import type { CharacterCatalog, CharacterDefinition } from "../../content/master-data/character-catalog";
import { Element } from "../../content/master-data/character-catalog";
import type { Clock } from "../../infrastructure/clock/clock";
import { InvariantError } from "../../shared/errors/application-error";
import type { PlayerCharacter, PlayerEquipment } from "../player/player.models";
import {
    RewardType,
    type GrantedCharacter,
    type GrantedEquipment,
    type PlayerWallet,
    type Reward,
    type RewardGrantResult,
} from "./reward.models";
import type { RewardRepository } from "./reward.repository";

const DUPE_ITEM_REWARDS: Partial<Record<number, Record<Element, number>>> = {
    3: {
        [Element.FIRE]: 14001,
        [Element.WATER]: 14004,
        [Element.LIGHTNING]: 14007,
        [Element.WIND]: 14010,
        [Element.LIGHT]: 14016,
        [Element.DARK]: 14013,
    },
    4: {
        [Element.FIRE]: 14002,
        [Element.WATER]: 14005,
        [Element.LIGHTNING]: 14008,
        [Element.WIND]: 14011,
        [Element.LIGHT]: 14017,
        [Element.DARK]: 14014,
    },
    5: {
        [Element.FIRE]: 14003,
        [Element.WATER]: 14006,
        [Element.LIGHTNING]: 14009,
        [Element.WIND]: 14012,
        [Element.LIGHT]: 14018,
        [Element.DARK]: 14015,
    },
};

function assertPositiveInteger(value: number, label: string): void {
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new InvariantError(`${label} must be a positive integer.`);
    }
}

function assertNonNegativeInteger(value: number, label: string): void {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new InvariantError(`${label} must be a non-negative integer.`);
    }
}

function addWallet(left: PlayerWallet, right: PlayerWallet): PlayerWallet {
    return {
        freeVmoney: left.freeVmoney + right.freeVmoney,
        freeMana: left.freeMana + right.freeMana,
        expPool: left.expPool + right.expPool,
    };
}

export class RewardService {
    constructor(
        private readonly repository: RewardRepository,
        private readonly characterCatalog: CharacterCatalog,
        private readonly clock: Clock,
    ) {}

    grantOne(playerId: number, reward: Reward): RewardGrantResult {
        return this.grant(playerId, [reward]);
    }

    grant(playerId: number, rewards: readonly Reward[]): RewardGrantResult {
        return this.repository.transaction(() => {
            const walletBefore = this.repository.getWallet(playerId);
            if (!walletBefore) throw new InvariantError("Player does not exist.");

            const deltas: PlayerWallet = {
                freeVmoney: 0,
                freeMana: 0,
                expPool: 0,
            };
            const characters: GrantedCharacter[] = [];
            const equipment: GrantedEquipment[] = [];
            const items: Record<string, number> = {};

            for (const reward of rewards) {
                switch (reward.type) {
                    case RewardType.ITEM: {
                        assertPositiveInteger(reward.id, "Item id");
                        assertPositiveInteger(reward.count, "Item reward count");
                        const total = this.addItem(playerId, reward.id, reward.count);
                        items[String(reward.id)] = total;
                        break;
                    }
                    case RewardType.EQUIPMENT: {
                        assertPositiveInteger(reward.id, "Equipment id");
                        assertPositiveInteger(reward.count, "Equipment reward count");
                        equipment.push(this.grantEquipment(playerId, reward.id, reward.count));
                        break;
                    }
                    case RewardType.CHARACTER: {
                        assertPositiveInteger(reward.id, "Character id");
                        const granted = this.grantCharacter(playerId, reward.id);
                        characters.push(granted);
                        if (granted.duplicateItem) {
                            items[String(granted.duplicateItem.id)] = granted.duplicateItem.total;
                        }
                        break;
                    }
                    case RewardType.BEADS:
                        assertNonNegativeInteger(reward.count, "Beads reward count");
                        deltas.freeVmoney += reward.count;
                        break;
                    case RewardType.MANA:
                        assertNonNegativeInteger(reward.count, "Mana reward count");
                        deltas.freeMana += reward.count;
                        break;
                    case RewardType.EXP:
                        assertNonNegativeInteger(reward.count, "EXP reward count");
                        deltas.expPool += reward.count;
                        break;
                    default: {
                        const exhaustive: never = reward;
                        throw new InvariantError(`Unsupported reward: ${String(exhaustive)}`);
                    }
                }
            }

            const walletAfter = addWallet(walletBefore, deltas);
            if (deltas.freeVmoney !== 0 || deltas.freeMana !== 0 || deltas.expPool !== 0) {
                this.repository.setWallet(playerId, walletAfter);
            }

            return {
                walletBefore,
                walletAfter,
                deltas,
                characters,
                equipment,
                items,
            };
        });
    }

    private addItem(playerId: number, itemId: number, amount: number): number {
        const total = (this.repository.getItemAmount(playerId, itemId) ?? 0) + amount;
        this.repository.setItemAmount(playerId, itemId, total);
        return total;
    }

    private grantEquipment(
        playerId: number,
        equipmentId: number,
        amount: number,
    ): GrantedEquipment {
        const owned = this.repository.getEquipment(playerId, equipmentId);
        if (!owned) {
            const equipment: PlayerEquipment = {
                level: 1,
                enhancementLevel: 0,
                protection: false,
                // World Flipper stores additional copies in stack; the first copy is implicit.
                stack: amount - 1,
            };
            this.repository.insertEquipment(playerId, equipmentId, equipment);
            return { equipmentId, equipment, isNew: true };
        }

        const equipment: PlayerEquipment = {
            ...owned,
            stack: owned.stack + amount,
        };
        this.repository.updateEquipmentStack(playerId, equipmentId, equipment.stack);
        return { equipmentId, equipment, isNew: false };
    }

    private grantCharacter(playerId: number, characterId: number): GrantedCharacter {
        const definition = this.requireCharacterDefinition(characterId);
        const owned = this.repository.getCharacter(playerId, characterId);
        const now = this.clock.now();

        if (!owned) {
            const bondTokenCount = definition.skillCount > 3 ? 2 : 1;
            const character: PlayerCharacter = {
                entryCount: 1,
                evolutionLevel: 0,
                overLimitStep: 0,
                protection: false,
                joinTime: now,
                updateTime: now,
                exp: 0,
                stack: 0,
                manaBoardIndex: 1,
                bondTokenList: Array.from({ length: bondTokenCount }, (_, index) => ({
                    manaBoardIndex: index + 1,
                    status: 0,
                })),
            };

            this.repository.insertCharacter(playerId, characterId, character);
            return { characterId, character, isNew: true };
        }

        const character: PlayerCharacter = {
            ...owned,
            stack: owned.stack + 1,
            updateTime: now,
        };
        this.repository.updateCharacterStack(playerId, characterId, character.stack, now);

        const duplicateItemId = DUPE_ITEM_REWARDS[definition.rarity]?.[definition.element];
        if (duplicateItemId === undefined) {
            return { characterId, character, isNew: false };
        }

        const total = this.addItem(playerId, duplicateItemId, 1);
        return {
            characterId,
            character,
            isNew: false,
            duplicateItem: {
                id: duplicateItemId,
                count: 1,
                total,
            },
        };
    }

    private requireCharacterDefinition(characterId: number): CharacterDefinition {
        const definition = this.characterCatalog.findById(characterId);
        if (!definition) {
            throw new InvariantError(`Character ${characterId} does not exist in master data.`);
        }
        return definition;
    }
}
