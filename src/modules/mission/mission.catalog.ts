import type { MissionDefinition } from "./mission.models";

export interface MissionCatalog {
    list(): readonly MissionDefinition[];
    findById(id: number): MissionDefinition | null;
}
