import type { RushFolderDefinition } from "./rush-event.models";

export interface RushEventCatalog {
    findFolder(eventId: number, folderId: number): RushFolderDefinition | null;
    findQuest(questId: number): { eventId: number; folderId: number; round: number } | null;
}
