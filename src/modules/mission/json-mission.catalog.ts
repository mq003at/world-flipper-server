import { readFileSync } from "node:fs";
import path from "node:path";
import { InvariantError } from "../../shared/errors/application-error";
import type { MissionCatalog } from "./mission.catalog";
import type { MissionDefinition } from "./mission.models";

export class JsonMissionCatalog implements MissionCatalog {
    private readonly definitions: MissionDefinition[];
    private readonly byId: Map<number, MissionDefinition>;

    constructor(liveContentDir: string) {
        this.definitions = JSON.parse(
            readFileSync(path.join(liveContentDir, "missions.json"), "utf8"),
        ) as MissionDefinition[];
        this.byId = new Map();
        for (const definition of this.definitions) {
            if (!Number.isSafeInteger(definition.id) || definition.id <= 0) {
                throw new InvariantError("Mission id must be a positive integer.");
            }
            if (this.byId.has(definition.id)) {
                throw new InvariantError(`Duplicate mission id ${definition.id}.`);
            }
            this.byId.set(definition.id, definition);
        }
    }

    list(): readonly MissionDefinition[] {
        return this.definitions;
    }

    findById(id: number): MissionDefinition | null {
        return this.byId.get(id) ?? null;
    }
}
