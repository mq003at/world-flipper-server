import type { MissionProgressState } from "./mission.models";

export interface MissionRepository {
    get(playerId: number, missionId: number, periodKey: string): MissionProgressState | null;
    upsert(state: MissionProgressState): void;
    markClaimed(playerId: number, missionId: number, periodKey: string, claimedAt: Date): void;
    transaction<T>(work: () => T): T;
}
