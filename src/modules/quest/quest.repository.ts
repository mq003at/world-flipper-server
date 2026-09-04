import type { PlayerCharacter, PlayerQuestProgress } from "../player/player.models";
import type { ActiveQuest, QuestPlayerState } from "./quest.models";
import type { QuestCategory } from "../../content/master-data/quest-catalog";

export interface QuestRepository {
    getPlayerState(playerId: number): QuestPlayerState | null;
    updatePartySlot(playerId: number, partySlot: number): void;
    updateStamina(playerId: number, stamina: number): void;
    updateBattleState(
        playerId: number,
        changes: {
            freeMana: number;
            expPool: number;
            rankPoint: number;
            boostPoint: number;
            bossBoostPoint: number;
        },
    ): void;
    updateContinueCurrency(playerId: number, freeVmoney: number, vmoney: number): void;
    addExpPool(playerId: number, amount: number): number;

    getQuestProgress(
        playerId: number,
        category: QuestCategory,
        questId: number,
    ): PlayerQuestProgress | null;
    upsertQuestProgress(
        playerId: number,
        category: QuestCategory,
        progress: PlayerQuestProgress,
    ): void;

    getActiveQuest(playerId: number): ActiveQuest | null;
    replaceActiveQuest(activeQuest: ActiveQuest): void;
    deleteActiveQuest(playerId: number): void;

    getCharacter(playerId: number, characterId: number): PlayerCharacter | null;
    updateCharacterExp(playerId: number, characterId: number, exp: number, updateTime: Date): void;

    transaction<T>(work: () => T): T;
}
