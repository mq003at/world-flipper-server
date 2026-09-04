export interface RaidEventRepository {
    getOrCreate(eventId:number): { hpPercentage:number; totalKillCount:number };
}
