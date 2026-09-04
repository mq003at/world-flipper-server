import type { PlayerImportSummary, PlayerSavePayload } from "./player-save.models";

export function presentPlayerExport(save: PlayerSavePayload): Record<string, unknown> {
    return {
        player_save: save,
    };
}

export function presentPlayerImport(result: PlayerImportSummary): Record<string, unknown> {
    return {
        imported: true,
        replace: result.replaced,
        player_id: result.playerId,
        imported_sections: result.importedSections,
        imported_rows: result.importedRows,
    };
}
