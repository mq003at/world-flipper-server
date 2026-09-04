export const PLAYER_SAVE_FORMAT = "world-flipper-server-player-save" as const;
export const PLAYER_SAVE_VERSION = 1 as const;

export type PortableScalar = string | number | null;
export type PortableRow = Record<string, PortableScalar>;

export interface PlayerSaveSource {
    schemaVersion: number;
    serverVersion?: string;
}

export interface PlayerSaveIntegrity {
    algorithm: "sha256";
    digest: string;
}

export interface PlayerSavePayload {
    format: typeof PLAYER_SAVE_FORMAT;
    version: typeof PLAYER_SAVE_VERSION;
    exportedAt: string;
    source: PlayerSaveSource;
    player: PortableRow;
    state: Record<string, PortableRow[]>;
    integrity: PlayerSaveIntegrity;
}

export interface PlayerSaveState {
    schemaVersion: number;
    player: PortableRow;
    state: Record<string, PortableRow[]>;
}

export interface PlayerImportSummary {
    playerId: number;
    importedSections: number;
    importedRows: number;
    replaced: true;
}
