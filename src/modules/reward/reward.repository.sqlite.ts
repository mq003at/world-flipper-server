import type { DatabaseConnection } from "../../infrastructure/database/database";
import type {
    CharacterBondToken,
    PlayerCharacter,
    PlayerEquipment,
} from "../player/player.models";
import type { PlayerWallet } from "./reward.models";
import type { RewardRepository } from "./reward.repository";

function fromDbBoolean(value: number): boolean {
    return value === 1;
}

function toDbBoolean(value: boolean): number {
    return value ? 1 : 0;
}

function deserializeNumberList(value: string | null): number[] | undefined {
    if (value === null) return undefined;
    if (value.length === 0) return [];
    return value.split(",").map((part) => Number(part));
}

export class SqliteRewardRepository implements RewardRepository {
    constructor(private readonly database: DatabaseConnection) {}

    getWallet(playerId: number): PlayerWallet | null {
        const row = this.database
            .prepare(`
                SELECT free_vmoney, free_mana, exp_pool
                FROM players
                WHERE id = ?
            `)
            .get(playerId) as
            | { free_vmoney: number; free_mana: number; exp_pool: number }
            | undefined;

        return row
            ? {
                  freeVmoney: row.free_vmoney,
                  freeMana: row.free_mana,
                  expPool: row.exp_pool,
              }
            : null;
    }

    setWallet(playerId: number, wallet: PlayerWallet): void {
        this.database
            .prepare(`
                UPDATE players
                SET free_vmoney = ?, free_mana = ?, exp_pool = ?
                WHERE id = ?
            `)
            .run(wallet.freeVmoney, wallet.freeMana, wallet.expPool, playerId);
    }

    getItemAmount(playerId: number, itemId: number): number | null {
        const row = this.database
            .prepare("SELECT amount FROM players_items WHERE player_id = ? AND id = ?")
            .get(playerId, itemId) as { amount: number } | undefined;
        return row?.amount ?? null;
    }

    setItemAmount(playerId: number, itemId: number, amount: number): void {
        this.database
            .prepare(`
                INSERT INTO players_items (id, amount, player_id)
                VALUES (?, ?, ?)
                ON CONFLICT(id, player_id)
                DO UPDATE SET amount = excluded.amount
            `)
            .run(itemId, amount, playerId);
    }

    getEquipment(playerId: number, equipmentId: number): PlayerEquipment | null {
        const row = this.database
            .prepare(`
                SELECT level, enhancement_level, protection, stack
                FROM players_equipment
                WHERE player_id = ? AND id = ?
            `)
            .get(playerId, equipmentId) as
            | {
                  level: number;
                  enhancement_level: number;
                  protection: number;
                  stack: number;
              }
            | undefined;

        return row
            ? {
                  level: row.level,
                  enhancementLevel: row.enhancement_level,
                  protection: fromDbBoolean(row.protection),
                  stack: row.stack,
              }
            : null;
    }

    insertEquipment(playerId: number, equipmentId: number, equipment: PlayerEquipment): void {
        this.database
            .prepare(`
                INSERT INTO players_equipment (
                    id, level, enhancement_level, protection, stack, player_id
                ) VALUES (?, ?, ?, ?, ?, ?)
            `)
            .run(
                equipmentId,
                equipment.level,
                equipment.enhancementLevel,
                toDbBoolean(equipment.protection),
                equipment.stack,
                playerId,
            );
    }

    updateEquipmentStack(playerId: number, equipmentId: number, stack: number): void {
        this.database
            .prepare(`
                UPDATE players_equipment
                SET stack = ?
                WHERE player_id = ? AND id = ?
            `)
            .run(stack, playerId, equipmentId);
    }

    getCharacter(playerId: number, characterId: number): PlayerCharacter | null {
        const row = this.database
            .prepare(`
                SELECT entry_count, evolution_level, over_limit_step, protection,
                       join_time, update_time, exp, stack, mana_board_index,
                       ex_boost_status_id, ex_boost_ability_id_list, illustration_settings
                FROM players_characters
                WHERE player_id = ? AND id = ?
            `)
            .get(playerId, characterId) as
            | {
                  entry_count: number;
                  evolution_level: number;
                  over_limit_step: number;
                  protection: number;
                  join_time: string;
                  update_time: string;
                  exp: number;
                  stack: number;
                  mana_board_index: number;
                  ex_boost_status_id: number | null;
                  ex_boost_ability_id_list: string | null;
                  illustration_settings: string | null;
              }
            | undefined;

        if (!row) return null;

        const bondTokenList = this.database
            .prepare(`
                SELECT mana_board_index, status
                FROM players_characters_bond_tokens
                WHERE player_id = ? AND character_id = ?
                ORDER BY mana_board_index
            `)
            .all(playerId, characterId) as Array<{
            mana_board_index: number;
            status: number;
        }>;

        const character: PlayerCharacter = {
            entryCount: row.entry_count,
            evolutionLevel: row.evolution_level,
            overLimitStep: row.over_limit_step,
            protection: fromDbBoolean(row.protection),
            joinTime: new Date(row.join_time),
            updateTime: new Date(row.update_time),
            exp: row.exp,
            stack: row.stack,
            manaBoardIndex: row.mana_board_index,
            bondTokenList: bondTokenList.map((token) => ({
                manaBoardIndex: token.mana_board_index,
                status: token.status,
            })),
        };

        const exBoostAbilityIds = deserializeNumberList(row.ex_boost_ability_id_list);
        if (row.ex_boost_status_id !== null && exBoostAbilityIds !== undefined) {
            character.exBoost = {
                statusId: row.ex_boost_status_id,
                abilityIdList: exBoostAbilityIds,
            };
        }

        const illustrationSettings = deserializeNumberList(row.illustration_settings);
        if (illustrationSettings !== undefined) {
            character.illustrationSettings = illustrationSettings;
        }

        return character;
    }

    insertCharacter(playerId: number, characterId: number, character: PlayerCharacter): void {
        this.database
            .prepare(`
                INSERT INTO players_characters (
                    id, entry_count, evolution_level, over_limit_step, protection,
                    join_time, update_time, exp, stack, mana_board_index, player_id,
                    ex_boost_status_id, ex_boost_ability_id_list, illustration_settings
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)
            `)
            .run(
                characterId,
                character.entryCount,
                character.evolutionLevel,
                character.overLimitStep,
                toDbBoolean(character.protection),
                character.joinTime.toISOString(),
                character.updateTime.toISOString(),
                character.exp,
                character.stack,
                character.manaBoardIndex,
                playerId,
            );

        const insertBondToken = this.database.prepare(`
            INSERT INTO players_characters_bond_tokens (
                mana_board_index, status, player_id, character_id
            ) VALUES (?, ?, ?, ?)
        `);

        for (const token of character.bondTokenList) {
            insertBondToken.run(token.manaBoardIndex, token.status, playerId, characterId);
        }
    }

    updateCharacterStack(
        playerId: number,
        characterId: number,
        stack: number,
        updateTime: Date,
    ): void {
        this.database
            .prepare(`
                UPDATE players_characters
                SET stack = ?, update_time = ?
                WHERE player_id = ? AND id = ?
            `)
            .run(stack, updateTime.toISOString(), playerId, characterId);
    }

    transaction<T>(work: () => T): T {
        return this.database.transaction(work)();
    }
}
