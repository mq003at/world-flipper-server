import type { CharacterCatalog } from "../../content/master-data/character-catalog";
import {
    type BattleQuestDefinition,
    type QuestCatalog,
    QuestCategory,
} from "../../content/master-data/quest-catalog";
import type { Clock } from "../../infrastructure/clock/clock";
import { InvalidRequestError, InvariantError } from "../../shared/errors/application-error";
import type { IdentityService } from "../identity/identity.service";
import type { PlayerService } from "../player/player.service";
import type { RewardService } from "../reward/reward.service";
import { CharacterExpService } from "./character-exp.service";
import type {
    FinishQuestRequest,
    StartQuestRequest,
    StoryFinishRequest,
    ViewerQuestRequest,
} from "./quest.contracts";
import type {
    ActiveQuest,
    BattleFinishResult,
    QuestPlayerState,
    StoryFinishResult,
} from "./quest.models";
import type { QuestRepository } from "./quest.repository";
import { ScoreRewardService } from "./score-reward.service";
import type { RandomSource } from "../../infrastructure/random/random-source";

const CONTINUE_VMONEY_COST = 50;

function calculateClearRank(quest: BattleQuestDefinition, elapsedTimeMs: number): number {
    if (quest.sPlusRankTime >= elapsedTimeMs) return 5;
    if (quest.sRankTime >= elapsedTimeMs) return 4;
    if (quest.aRankTime >= elapsedTimeMs) return 3;
    if (quest.bRankTime >= elapsedTimeMs) return 2;
    return 1;
}

export class QuestService {
    private readonly characterExpService: CharacterExpService;
    private readonly scoreRewardService: ScoreRewardService;

    constructor(
        private readonly identityService: IdentityService,
        private readonly playerService: PlayerService,
        private readonly repository: QuestRepository,
        private readonly catalog: QuestCatalog,
        private readonly rewardService: RewardService,
        characterCatalog: CharacterCatalog,
        private readonly clock: Clock,
        random: RandomSource,
    ) {
        this.characterExpService = new CharacterExpService(repository, characterCatalog, clock);
        this.scoreRewardService = new ScoreRewardService(catalog, rewardService, random);
    }

    start(input: StartQuestRequest): void {
        const player = this.requirePlayer(input.viewerId);
        const quest = this.catalog.findQuest(input.category, input.questId);
        if (!quest || quest.kind !== "battle") throw new InvalidRequestError("Quest doesn't exist.");

        this.repository.transaction(() => {
            const activeQuest: ActiveQuest = {
                playerId: player.id,
                questId: input.questId,
                category: input.category,
                useBossBoostPoint: input.useBossBoostPoint,
                useBoostPoint: input.useBoostPoint,
                isAutoStartMode: input.isAutoStartMode,
                partyId: input.partyId,
                playId: input.playId,
                startedAt: this.clock.now(),
            };
            this.repository.replaceActiveQuest(activeQuest);
            if (quest.fixedParty === undefined) {
                this.repository.updatePartySlot(player.id, input.partyId);
            }
        });
    }

    abort(input: ViewerQuestRequest): void {
        const player = this.requirePlayer(input.viewerId);
        this.repository.deleteActiveQuest(player.id);
    }

    continue(input: ViewerQuestRequest): { freeVmoney: number; vmoney: number } {
        const player = this.requirePlayer(input.viewerId);
        const active = this.repository.getActiveQuest(player.id);
        if (!active) throw new InvalidRequestError("No active quest to continue.");

        return this.repository.transaction(() => {
            const state = this.requirePlayerState(player.id);
            const newFreeVmoney = state.freeVmoney - CONTINUE_VMONEY_COST;
            const newVmoney = newFreeVmoney < 0
                ? state.vmoney - CONTINUE_VMONEY_COST
                : state.vmoney;
            if (newFreeVmoney < 0 && newVmoney < 0) {
                throw new InvalidRequestError("Not enough vmoney to continue");
            }

            // Preserve legacy charging semantics: if free currency cannot pay the whole
            // continue, paid currency pays the whole 50 instead of splitting the cost.
            const setFreeVmoney = newFreeVmoney < 0 ? state.freeVmoney : newFreeVmoney;
            this.repository.updateContinueCurrency(player.id, setFreeVmoney, newVmoney);
            return { freeVmoney: setFreeVmoney, vmoney: newVmoney };
        });
    }

    finishStory(input: StoryFinishRequest): StoryFinishResult {
        const player = this.requirePlayer(input.viewerId);
        const quest = this.catalog.findQuest(input.category, input.questId);
        if (!quest || quest.kind !== "story") {
            throw new InvalidRequestError("Invalid quest ID provided.");
        }

        return this.repository.transaction(() => {
            const progress = this.repository.getQuestProgress(player.id, input.category, input.questId);
            const alreadyFinished = progress?.finished ?? false;
            if (alreadyFinished) {
                return {
                    viewerId: input.viewerId,
                    alreadyFinished: true,
                    player: this.requirePlayerState(player.id),
                    grant: null,
                };
            }

            const grant = quest.clearReward
                ? this.rewardService.grantOne(player.id, quest.clearReward)
                : null;
            this.repository.upsertQuestProgress(player.id, input.category, {
                questId: input.questId,
                finished: true,
                ...(progress?.highScore === undefined ? {} : { highScore: progress.highScore }),
                ...(progress?.clearRank === undefined ? {} : { clearRank: progress.clearRank }),
                ...(progress?.bestElapsedTimeMs === undefined
                    ? {}
                    : { bestElapsedTimeMs: progress.bestElapsedTimeMs }),
            });

            return {
                viewerId: input.viewerId,
                alreadyFinished: false,
                player: this.requirePlayerState(player.id),
                grant,
            };
        });
    }

    finishBattle(input: FinishQuestRequest): BattleFinishResult {
        const player = this.requirePlayer(input.viewerId);
        const active = this.repository.getActiveQuest(player.id);
        if (!active) throw new InvalidRequestError("No active quest to finish.");

        const quest = this.catalog.findQuest(active.category, active.questId);
        if (!quest || quest.kind !== "battle") throw new InvalidRequestError("Quest doesn't exist.");

        return this.repository.transaction(() => {
            const playerBefore = this.requirePlayerState(player.id);
            const progress = this.repository.getQuestProgress(player.id, active.category, active.questId);
            const clearRank = calculateClearRank(quest, input.elapsedTimeMs);
            const beforeRankPoint = playerBefore.rankPoint;
            const boostPoint = playerBefore.boostPoint - (active.useBoostPoint ? 1 : 0);
            const bossBoostPoint = playerBefore.bossBoostPoint - (active.useBossBoostPoint ? 1 : 0);
            const boostWasAvailable =
                (active.useBoostPoint && boostPoint >= 0)
                || (active.useBossBoostPoint && bossBoostPoint >= 0);

            this.repository.updateBattleState(player.id, {
                freeMana: playerBefore.freeMana + quest.manaReward + input.addMana,
                expPool: playerBefore.expPool + quest.poolExpReward,
                rankPoint: playerBefore.rankPoint + quest.rankPointReward,
                boostPoint,
                bossBoostPoint,
            });

            const previouslyCompleted = progress !== null;
            const clearGrant = !previouslyCompleted && quest.clearReward
                ? this.rewardService.grantOne(player.id, quest.clearReward)
                : null;
            const sPlusGrant = clearRank === 5
                && progress?.clearRank !== 5
                && quest.sPlusReward
                ? this.rewardService.grantOne(player.id, quest.sPlusReward)
                : null;

            if (input.isAccomplished) {
                this.repository.upsertQuestProgress(player.id, active.category, {
                    questId: active.questId,
                    finished: true,
                    bestElapsedTimeMs: progress?.bestElapsedTimeMs === undefined
                        ? input.elapsedTimeMs
                        : Math.min(input.elapsedTimeMs, progress.bestElapsedTimeMs),
                    clearRank: progress?.clearRank === undefined
                        ? clearRank
                        : Math.max(clearRank, progress.clearRank),
                    highScore: progress?.highScore === undefined
                        ? input.score
                        : Math.max(input.score, progress.highScore),
                });
            }

            const scoreRewards = this.scoreRewardService.grant(
                player.id,
                quest.scoreRewardGroupId,
                boostWasAvailable,
            );
            const partyCharacterIds = [
                ...input.statistics.characters,
                ...input.statistics.unisonCharacters,
            ].filter((id): id is number => id !== null);
            const characterExp = this.characterExpService.grant(
                player.id,
                partyCharacterIds,
                quest.characterExpReward,
                quest.fixedParty !== undefined,
            );

            // Active battle survives server restarts during play, but finishing it consumes it.
            this.repository.deleteActiveQuest(player.id);
            const playerAfter = this.requirePlayerState(player.id);

            return {
                viewerId: input.viewerId,
                category: active.category,
                clearRank,
                oldHighScore: progress?.highScore ?? 0,
                beforeRankPoint,
                player: playerAfter,
                questPoolExpReward: quest.poolExpReward,
                questManaReward: quest.manaReward,
                fieldMana: input.addMana,
                characterExp,
                clearGrant,
                sPlusGrant,
                scoreRewards,
            };
        });
    }

    private requirePlayer(viewerId: number): { id: number } {
        const viewer = this.identityService.requireViewerSession(viewerId);
        return this.playerService.requireForAccount(viewer.accountId);
    }

    private requirePlayerState(playerId: number): QuestPlayerState {
        const state = this.repository.getPlayerState(playerId);
        if (!state) throw new InvariantError("No player bound to account.");
        return state;
    }
}
