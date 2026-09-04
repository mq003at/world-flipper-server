export interface QuestAvailabilityPolicy {
    assertQuestStartAvailable(category: number, questId: number, now: Date): void;
    assertQuestFinishAvailable(category: number, questId: number, now: Date): void;
}
