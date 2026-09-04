import type { PlayerPartyGroup } from "../../player/player.models";
import type { RushEventBattleType, RushEventState, RushPlayedParty, RushRankingEntry } from "./rush-event.models";

export interface RushEventRepository {
    findState(playerId: number, eventId: number): RushEventState | null;
    createState(playerId: number, eventId: number): RushEventState;
    setActiveFolder(playerId: number, eventId: number, folderId: number | null): void;
    updateEndlessBest(playerId: number, eventId: number, round: number, elapsedTimeMs: number, characterIds: Array<number | null>, evolutionLevels: Array<number | null>): void;
    listClearedFolders(playerId: number, eventId: number): number[];
    markFolderCleared(playerId: number, eventId: number, folderId: number): void;
    listPlayedParties(playerId: number, eventId: number): RushPlayedParty[];
    insertPlayedParty(party: RushPlayedParty): void;
    deletePlayedParties(playerId: number, eventId: number, battleType: RushEventBattleType): void;
    deletePlayedParty(playerId: number, eventId: number, battleType: RushEventBattleType, round: number): void;
    deletePlayedPartiesFrom(playerId: number, eventId: number, battleType: RushEventBattleType, round: number): void;
    nextEndlessRound(playerId: number, eventId: number): number;
    rankingForPlayer(playerId: number, eventId: number): RushRankingEntry | null;
    rankingPage(eventId: number, page: number, pageSize?: number): { pageMax: number; list: RushRankingEntry[] };
    playerIdAtRank(eventId: number, rank: number): number | null;
    getCharacterEvolutionLevels(playerId: number, characterIds: Array<number | null>): Array<number | null>;
    loadPartyGroups(playerId: number, category: number): Record<string, PlayerPartyGroup>;
    ensureEventPartyGroups(playerId: number): Record<string, PlayerPartyGroup>;
    transaction<T>(work: () => T): T;
}
