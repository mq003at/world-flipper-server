import { readFileSync } from "node:fs";
import path from "node:path";
import { RewardType, type Reward } from "../../reward/reward.models";
import type { RushEventCatalog } from "./rush-event.catalog";
import type { RushFolderDefinition } from "./rush-event.models";

type RawQuest = { rushEventId: number; rushEventFolderId: number; rushEventRound: number };
type RawReward = { type: number; id?: number; count?: number };

function toReward(raw: RawReward): Reward | null {
    switch (raw.type) {
        case RewardType.ITEM:
        case RewardType.EQUIPMENT:
            return raw.id === undefined || raw.count === undefined ? null : { type: raw.type, id: raw.id, count: raw.count };
        case RewardType.CHARACTER:
            return raw.id === undefined ? null : { type: RewardType.CHARACTER, id: raw.id };
        case RewardType.BEADS:
        case RewardType.MANA:
        case RewardType.EXP:
            return raw.count === undefined ? null : { type: raw.type, count: raw.count };
        default:
            return null;
    }
}

export class JsonRushEventCatalog implements RushEventCatalog {
    private readonly quests = new Map<number, { eventId: number; folderId: number; round: number }>();
    private readonly folders = new Map<string, RushFolderDefinition>();

    constructor(masterDataDir: string) {
        const rawQuests = JSON.parse(readFileSync(path.join(masterDataDir, "rush_event_quest.json"), "utf8")) as Record<string, RawQuest>;
        const rawRewards = JSON.parse(readFileSync(path.join(masterDataDir, "rush_event_quest_folder.json"), "utf8")) as Record<string, Record<string, RawReward[]>>;
        const maxRounds = new Map<string, number>();
        for (const [questId, raw] of Object.entries(rawQuests)) {
            const parsed = { eventId: raw.rushEventId, folderId: raw.rushEventFolderId, round: raw.rushEventRound };
            this.quests.set(Number(questId), parsed);
            if (raw.rushEventRound > 0) {
                const key = `${raw.rushEventId}:${raw.rushEventFolderId}`;
                maxRounds.set(key, Math.max(maxRounds.get(key) ?? 0, raw.rushEventRound));
            }
        }
        for (const [eventIdRaw, folders] of Object.entries(rawRewards)) {
            for (const [folderIdRaw, rewards] of Object.entries(folders)) {
                const eventId = Number(eventIdRaw);
                const folderId = Number(folderIdRaw);
                const key = `${eventId}:${folderId}`;
                this.folders.set(key, {
                    eventId,
                    folderId,
                    maxRound: maxRounds.get(key) ?? 0,
                    rewards: rewards.flatMap((reward) => {
                        const parsed = toReward(reward);
                        return parsed ? [parsed] : [];
                    }),
                });
            }
        }
    }

    findFolder(eventId: number, folderId: number): RushFolderDefinition | null {
        return this.folders.get(`${eventId}:${folderId}`) ?? null;
    }

    findQuest(questId: number): { eventId: number; folderId: number; round: number } | null {
        return this.quests.get(questId) ?? null;
    }
}
