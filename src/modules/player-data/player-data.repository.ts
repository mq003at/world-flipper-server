import type { PlayerImportSummary, PlayerSaveState } from "./player-save.models";

export interface PlayerDataRepository {
    findPlayerIdByViewerId(viewerId: number): number | null;
    playerExists(playerId: number): boolean;
    exportState(playerId: number): PlayerSaveState;
    replaceState(playerId: number, save: PlayerSaveState): PlayerImportSummary;
}
