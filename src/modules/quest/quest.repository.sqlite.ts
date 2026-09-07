import type { DatabaseConnection } from "../../infrastructure/database/database";
import type { QuestCategory } from "../../content/master-data/quest-catalog";
import type { PlayerCharacter, PlayerQuestProgress } from "../player/player.models";
import type { ActiveQuest, QuestPlayerState } from "./quest.models";
import type { QuestRepository } from "./quest.repository";
import { resolvePlayerStamina } from "../stamina/infinite-stamina.policy";

function fromDbBoolean(value: number): boolean {
    return value === 1;
}

function toDbBoolean(value: boolean): number {
    return value ? 1 : 0;
}

function deserializeNumberList(value: string | null): number[] | undefined {
    if (value === null) return undefined;
    if (value === "") return [];
    return value.split(",").map(Number);
}

export class SqliteQuestRepository implements QuestRepository {
    constructor(private readonly database: DatabaseConnection) {}

    getPlayerState(playerId: number): QuestPlayerState | null {
        const row = this.database.prepare(`
            SELECT id, stamina, stamina_heal_time, boost_point, boss_boost_point,
                   vmoney, free_vmoney, rank_point, exp_pool, exp_pooled_time,
                   free_mana, party_slot
            FROM players
            WHERE id = ?
        `).get(playerId) as {
            id: number;
            stamina: number;
            stamina_heal_time: string;
            boost_point: number;
            boss_boost_point: number;
            vmoney: number;
            free_vmoney: number;
            rank_point: number;
            exp_pool: number;
            exp_pooled_time: string;
            free_mana: number;
            party_slot: number;
        } | undefined;

        if (!row) return null;
        return {
            playerId: row.id,
            stamina: resolvePlayerStamina(),
            staminaHealTime: new Date(row.stamina_heal_time),
            boostPoint: row.boost_point,
            bossBoostPoint: row.boss_boost_point,
            vmoney: row.vmoney,
            freeVmoney: row.free_vmoney,
            rankPoint: row.rank_point,
            expPool: row.exp_pool,
            expPooledTime: new Date(row.exp_pooled_time),
            freeMana: row.free_mana,
            partySlot: row.party_slot,
        };
    }

    updatePartySlot(playerId: number, partySlot: number): void {
        this.database.prepare("UPDATE players SET party_slot = ? WHERE id = ?")
            .run(partySlot, playerId);
    }

    updateStamina(playerId: number, stamina: number): void {
        // Infinite-stamina mode never persists a depleted value.
        this.database.prepare("UPDATE players SET stamina = ? WHERE id = ?")
            .run(resolvePlayerStamina(), playerId);
    }

    updateBattleState(
        playerId: number,
        changes: {
            freeMana: number;
            expPool: number;
            rankPoint: number;
            boostPoint: number;
            bossBoostPoint: number;
        },
    ): void {
        this.database.prepare(`
            UPDATE players
            SET free_mana = ?, exp_pool = ?, rank_point = ?,
                boost_point = ?, boss_boost_point = ?
            WHERE id = ?
        `).run(
            changes.freeMana,
            changes.expPool,
            changes.rankPoint,
            changes.boostPoint,
            changes.bossBoostPoint,
            playerId,
        );
    }

    updateContinueCurrency(playerId: number, freeVmoney: number, vmoney: number): void {
        this.database.prepare(`
            UPDATE players SET free_vmoney = ?, vmoney = ? WHERE id = ?
        `).run(freeVmoney, vmoney, playerId);
    }

    addExpPool(playerId: number, amount: number): number {
        this.database.prepare("UPDATE players SET exp_pool = exp_pool + ? WHERE id = ?")
            .run(amount, playerId);
        const row = this.database.prepare("SELECT exp_pool FROM players WHERE id = ?")
            .get(playerId) as { exp_pool: number } | undefined;
        return row?.exp_pool ?? 0;
    }

    getQuestProgress(
        playerId: number,
        category: QuestCategory,
        questId: number,
    ): PlayerQuestProgress | null {
        const row = this.database.prepare(`
            SELECT quest_id, finished, high_score, clear_rank, best_elapsed_time_ms
            FROM players_quest_progress
            WHERE player_id = ? AND section = ? AND quest_id = ?
        `).get(playerId, category, questId) as {
            quest_id: number;
            finished: number;
            high_score: number | null;
            clear_rank: number | null;
            best_elapsed_time_ms: number | null;
        } | undefined;

        if (!row) return null;
        return {
            questId: row.quest_id,
            finished: fromDbBoolean(row.finished),
            ...(row.high_score === null ? {} : { highScore: row.high_score }),
            ...(row.clear_rank === null ? {} : { clearRank: row.clear_rank }),
            ...(row.best_elapsed_time_ms === null
                ? {}
                : { bestElapsedTimeMs: row.best_elapsed_time_ms }),
        };
    }

    upsertQuestProgress(
        playerId: number,
        category: QuestCategory,
        progress: PlayerQuestProgress,
    ): void {
        this.database.prepare(`
            INSERT INTO players_quest_progress (
                section, quest_id, finished, high_score, clear_rank,
                best_elapsed_time_ms, player_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(section, quest_id, player_id) DO UPDATE SET
                finished = excluded.finished,
                high_score = excluded.high_score,
                clear_rank = excluded.clear_rank,
                best_elapsed_time_ms = excluded.best_elapsed_time_ms
        `).run(
            category,
            progress.questId,
            toDbBoolean(progress.finished),
            progress.highScore ?? null,
            progress.clearRank ?? null,
            progress.bestElapsedTimeMs ?? null,
            playerId,
        );
    }

    getActiveQuest(playerId: number): ActiveQuest | null {
        const row = this.database.prepare(`
            SELECT player_id, quest_id, category, use_boss_boost_point,
                   use_boost_point, is_auto_start_mode, party_id, play_id, started_at
            FROM player_active_quests
            WHERE player_id = ?
        `).get(playerId) as {
            player_id: number;
            quest_id: number;
            category: number;
            use_boss_boost_point: number;
            use_boost_point: number;
            is_auto_start_mode: number;
            party_id: number;
            play_id: string;
            started_at: string;
        } | undefined;

        return row ? {
            playerId: row.player_id,
            questId: row.quest_id,
            category: row.category as QuestCategory,
            useBossBoostPoint: fromDbBoolean(row.use_boss_boost_point),
            useBoostPoint: fromDbBoolean(row.use_boost_point),
            isAutoStartMode: fromDbBoolean(row.is_auto_start_mode),
            partyId: row.party_id,
            playId: row.play_id,
            startedAt: new Date(row.started_at),
        } : null;
    }

    replaceActiveQuest(activeQuest: ActiveQuest): void {
        this.database.prepare(`
            INSERT INTO player_active_quests (
                player_id, quest_id, category, use_boss_boost_point,
                use_boost_point, is_auto_start_mode, party_id, play_id, started_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(player_id) DO UPDATE SET
                quest_id = excluded.quest_id,
                category = excluded.category,
                use_boss_boost_point = excluded.use_boss_boost_point,
                use_boost_point = excluded.use_boost_point,
                is_auto_start_mode = excluded.is_auto_start_mode,
                party_id = excluded.party_id,
                play_id = excluded.play_id,
                started_at = excluded.started_at
        `).run(
            activeQuest.playerId,
            activeQuest.questId,
            activeQuest.category,
            toDbBoolean(activeQuest.useBossBoostPoint),
            toDbBoolean(activeQuest.useBoostPoint),
            toDbBoolean(activeQuest.isAutoStartMode),
            activeQuest.partyId,
            activeQuest.playId,
            activeQuest.startedAt.toISOString(),
        );
    }

    deleteActiveQuest(playerId: number): void {
        this.database.prepare("DELETE FROM player_active_quests WHERE player_id = ?")
            .run(playerId);
    }

    getCharacter(playerId: number, characterId: number): PlayerCharacter | null {
        const row = this.database.prepare(`
            SELECT entry_count, evolution_level, over_limit_step, protection,
                   join_time, update_time, exp, stack, mana_board_index,
                   ex_boost_status_id, ex_boost_ability_id_list, illustration_settings
            FROM players_characters
            WHERE player_id = ? AND id = ?
        `).get(playerId, characterId) as {
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
        } | undefined;
        if (!row) return null;

        const tokens = this.database.prepare(`
            SELECT mana_board_index, status
            FROM players_characters_bond_tokens
            WHERE player_id = ? AND character_id = ?
            ORDER BY mana_board_index
        `).all(playerId, characterId) as Array<{ mana_board_index: number; status: number }>;

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
            bondTokenList: tokens.map((token) => ({
                manaBoardIndex: token.mana_board_index,
                status: token.status,
            })),
        };
        const exAbilities = deserializeNumberList(row.ex_boost_ability_id_list);
        if (row.ex_boost_status_id !== null && exAbilities !== undefined) {
            character.exBoost = {
                statusId: row.ex_boost_status_id,
                abilityIdList: exAbilities,
            };
        }
        const illustrationSettings = deserializeNumberList(row.illustration_settings);
        if (illustrationSettings !== undefined) character.illustrationSettings = illustrationSettings;
        return character;
    }

    updateCharacterExp(
        playerId: number,
        characterId: number,
        exp: number,
        updateTime: Date,
    ): void {
        this.database.prepare(`
            UPDATE players_characters
            SET exp = ?, update_time = ?
            WHERE player_id = ? AND id = ?
        `).run(exp, updateTime.toISOString(), playerId, characterId);
    }

    transaction<T>(work: () => T): T {
        return this.database.transaction(work)();
    }
}
