import assert from "node:assert/strict";
import test from "node:test";
import { QuestCategory, type BattleQuestDefinition } from "../../src/content/master-data/quest-catalog";
import { RushQuestFinishExtension } from "../../src/modules/events/rush/rush-event.completion";
import type { RushEventCatalog } from "../../src/modules/events/rush/rush-event.catalog";
import { RushEventBattleType, type RushEventState, type RushPlayedParty } from "../../src/modules/events/rush/rush-event.models";
import type { RushEventRepository } from "../../src/modules/events/rush/rush-event.repository";
import { RewardType, type RewardGrantResult } from "../../src/modules/reward/reward.models";
import type { RewardService } from "../../src/modules/reward/reward.service";

const emptyGrant: RewardGrantResult = {
    walletBefore: { freeVmoney: 0, freeMana: 0, expPool: 0 },
    walletAfter: { freeVmoney: 0, freeMana: 100, expPool: 0 },
    deltas: { freeVmoney: 0, freeMana: 100, expPool: 0 },
    characters: [], equipment: [], items: {},
};

class FakeRushRepository implements RushEventRepository {
    state: RushEventState = {
        playerId: 1, eventId: 9, activeFolderId: 2,
        endlessMaxRound: null, endlessMaxRoundTime: null,
        endlessMaxRoundCharacterIds: [null, null, null],
        endlessMaxRoundEvolutionLevels: [null, null, null],
    };
    parties: RushPlayedParty[] = [];
    cleared: number[] = [];

    findState(): RushEventState | null { return this.state; }
    createState(): RushEventState { return this.state; }
    setActiveFolder(_p: number, _e: number, folderId: number | null): void { this.state.activeFolderId = folderId; }
    updateEndlessBest(): void {}
    listClearedFolders(): number[] { return this.cleared; }
    markFolderCleared(_p: number, _e: number, folderId: number): void { if (!this.cleared.includes(folderId)) this.cleared.push(folderId); }
    listPlayedParties(): RushPlayedParty[] { return [...this.parties]; }
    insertPlayedParty(party: RushPlayedParty): void { this.parties.push(party); }
    deletePlayedParties(_p: number, _e: number, type: RushEventBattleType): void { this.parties = this.parties.filter((x) => x.battleType !== type); }
    deletePlayedParty(): void {}
    deletePlayedPartiesFrom(): void {}
    nextEndlessRound(): number { return 1; }
    rankingForPlayer(): null { return null; }
    rankingPage(): { pageMax: number; list: [] } { return { pageMax: 0, list: [] }; }
    playerIdAtRank(): null { return null; }
    getCharacterEvolutionLevels(_p: number, ids: Array<number | null>): Array<number | null> { return ids.map((id) => id === null ? null : 1); }
    loadPartyGroups(): Record<string, never> { return {}; }
    ensureEventPartyGroups(): Record<string, never> { return {}; }
    transaction<T>(work: () => T): T { return work(); }
}

test("finishing the final rush folder round closes the folder and grants its clear reward", () => {
    const repository = new FakeRushRepository();
    repository.parties.push({
        playerId: 1, eventId: 9, round: 1, battleType: RushEventBattleType.FOLDER,
        characterIds: [1, null, null], unisonCharacterIds: [null, null, null],
        equipmentIds: [null, null, null], abilitySoulIds: [null, null, null],
        evolutionLevels: [1, null, null], unisonEvolutionLevels: [null, null, null],
    });
    const catalog: RushEventCatalog = {
        findQuest: (questId) => questId === 9002 ? { eventId: 9, folderId: 2, round: 2 } : null,
        findFolder: (eventId, folderId) => eventId === 9 && folderId === 2
            ? { eventId: 9, folderId: 2, maxRound: 2, rewards: [{ type: RewardType.MANA, count: 100 }] }
            : null,
    };
    let granted = 0;
    const rewardService = { grant: () => { granted += 1; return emptyGrant; } } as unknown as RewardService;
    const extension = new RushQuestFinishExtension(repository, catalog, rewardService);
    const quest: BattleQuestDefinition = {
        kind: "battle", id: 9002, category: QuestCategory.RUSH_EVENT, name: "rush",
        bRankTime: 99999, aRankTime: 99999, sRankTime: 99999, sPlusRankTime: 99999,
        rankPointReward: 0, characterExpReward: 0, manaReward: 0, poolExpReward: 0,
        rushEventId: 9, rushEventFolderId: 2, rushEventRound: 2,
    };
    const result = extension.afterCoreFinish({
        playerId: 1, viewerId: 1, category: QuestCategory.RUSH_EVENT, questId: 9002,
        quest, elapsedTimeMs: 1234, isAccomplished: true,
        statistics: {
            characters: [1, 2, 3], unisonCharacters: [null, null, null],
            equipmentIds: [null, null, null], abilitySoulIds: [null, null, null],
        },
    });

    assert.ok(result);
    assert.equal(granted, 1);
    assert.deepEqual(repository.cleared, [2]);
    assert.equal(repository.state.activeFolderId, null);
    assert.equal(repository.parties.length, 1);
    assert.equal(repository.parties[0]?.round, 2);
    assert.equal(result.grant, emptyGrant);
});
