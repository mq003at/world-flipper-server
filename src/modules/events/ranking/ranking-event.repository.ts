export interface RankingEventRepository {
    hasClaimed(playerId: number, eventId: number): boolean;
    markClaimed(playerId: number, eventId: number, claimedAt: Date): void;
}
