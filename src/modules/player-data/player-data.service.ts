import { createHash } from "node:crypto";
import type { Clock } from "../../infrastructure/clock/clock";
import { InvalidRequestError } from "../../shared/errors/application-error";
import type { PlayerDataRepository } from "./player-data.repository";
import {
    PLAYER_SAVE_FORMAT,
    PLAYER_SAVE_VERSION,
    type PlayerImportSummary,
    type PlayerSavePayload,
    type PlayerSaveState,
    type PortableRow,
    type PortableScalar,
} from "./player-save.models";
import { PORTABLE_SECTION_KEYS } from "./player-save.registry";

function stableStringify(value: unknown): string {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
        .join(",")}}`;
}

function digestPayload(payload: Omit<PlayerSavePayload, "integrity">): string {
    return createHash("sha256").update(stableStringify(payload), "utf8").digest("hex");
}

function requireScalar(value: unknown, context: string): PortableScalar {
    if (
        value === null ||
        typeof value === "string" ||
        (typeof value === "number" && Number.isFinite(value))
    ) {
        return value;
    }
    throw new InvalidRequestError(`Invalid player-save value at ${context}.`);
}

function requireRow(value: unknown, context: string): PortableRow {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new InvalidRequestError(`Invalid player-save row at ${context}.`);
    }
    const result: PortableRow = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        result[key] = requireScalar(item, `${context}.${key}`);
    }
    return result;
}

export class PlayerDataService {
    constructor(
        private readonly repository: PlayerDataRepository,
        private readonly clock: Clock,
    ) {}

    exportPlayer(playerId: number): PlayerSavePayload {
        const state = this.repository.exportState(playerId);
        const unsigned: Omit<PlayerSavePayload, "integrity"> = {
            format: PLAYER_SAVE_FORMAT,
            version: PLAYER_SAVE_VERSION,
            exportedAt: this.clock.now().toISOString(),
            source: {
                schemaVersion: state.schemaVersion,
            },
            player: state.player,
            state: state.state,
        };
        return {
            ...unsigned,
            integrity: {
                algorithm: "sha256",
                digest: digestPayload(unsigned),
            },
        };
    }

    importPlayer(playerId: number, input: unknown): PlayerImportSummary {
        const save = this.parseAndVerify(input);
        const state: PlayerSaveState = {
            schemaVersion: save.source.schemaVersion,
            player: save.player,
            state: save.state,
        };
        return this.repository.replaceState(playerId, state);
    }

    private parseAndVerify(input: unknown): PlayerSavePayload {
        if (input === null || typeof input !== "object" || Array.isArray(input)) {
            throw new InvalidRequestError("Invalid player save.");
        }
        const raw = input as Record<string, unknown>;
        if (raw.format !== PLAYER_SAVE_FORMAT) {
            throw new InvalidRequestError("Unsupported player-save format.");
        }
        if (raw.version !== PLAYER_SAVE_VERSION) {
            throw new InvalidRequestError(`Unsupported player-save version: ${String(raw.version)}`);
        }
        if (typeof raw.exportedAt !== "string" || Number.isNaN(Date.parse(raw.exportedAt))) {
            throw new InvalidRequestError("Invalid player-save exportedAt.");
        }
        if (raw.source === null || typeof raw.source !== "object" || Array.isArray(raw.source)) {
            throw new InvalidRequestError("Invalid player-save source.");
        }
        const sourceRaw = raw.source as Record<string, unknown>;
        if (!Number.isInteger(sourceRaw.schemaVersion) || (sourceRaw.schemaVersion as number) < 0) {
            throw new InvalidRequestError("Invalid player-save schema version.");
        }

        const player = requireRow(raw.player, "player");
        if (raw.state === null || typeof raw.state !== "object" || Array.isArray(raw.state)) {
            throw new InvalidRequestError("Invalid player-save state.");
        }
        const stateRaw = raw.state as Record<string, unknown>;
        const state: Record<string, PortableRow[]> = {};
        for (const key of Object.keys(stateRaw)) {
            if (!PORTABLE_SECTION_KEYS.has(key)) {
                throw new InvalidRequestError(`Unsupported player-save section: ${key}`);
            }
            const rowsRaw = stateRaw[key];
            if (!Array.isArray(rowsRaw)) {
                throw new InvalidRequestError(`Invalid player-save section: ${key}`);
            }
            state[key] = rowsRaw.map((row, index) => requireRow(row, `state.${key}[${index}]`));
        }
        for (const key of PORTABLE_SECTION_KEYS) {
            if (!(key in state)) throw new InvalidRequestError(`Player save is missing section: ${key}`);
        }

        if (raw.integrity === null || typeof raw.integrity !== "object" || Array.isArray(raw.integrity)) {
            throw new InvalidRequestError("Player save has no integrity digest.");
        }
        const integrityRaw = raw.integrity as Record<string, unknown>;
        if (integrityRaw.algorithm !== "sha256" || typeof integrityRaw.digest !== "string") {
            throw new InvalidRequestError("Unsupported player-save integrity data.");
        }

        const save: PlayerSavePayload = {
            format: PLAYER_SAVE_FORMAT,
            version: PLAYER_SAVE_VERSION,
            exportedAt: raw.exportedAt,
            source: { schemaVersion: sourceRaw.schemaVersion as number },
            player,
            state,
            integrity: {
                algorithm: "sha256",
                digest: integrityRaw.digest,
            },
        };
        const { integrity: _integrity, ...unsigned } = save;
        const expected = digestPayload(unsigned);
        if (expected !== save.integrity.digest.toLowerCase()) {
            throw new InvalidRequestError("Player-save integrity check failed.");
        }
        return save;
    }
}
