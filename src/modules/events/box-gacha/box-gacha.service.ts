import {
    BoxGachaRewardType,
    type BoxGachaBoxDefinition,
    type BoxGachaCatalog,
    type BoxGachaDefinition,
} from "../../../content/master-data/box-gacha-catalog";
import type { Clock } from "../../../infrastructure/clock/clock";
import type { RandomSource } from "../../../infrastructure/random/random-source";
import { InvalidRequestError, InvariantError } from "../../../shared/errors/application-error";
import type { IdentityService } from "../../identity/identity.service";
import type { PlayerService } from "../../player/player.service";
import { RewardType, type Reward } from "../../reward/reward.models";
import type { RewardService } from "../../reward/reward.service";
import type { EventRegistry } from "../event-registry/event.registry";
import type { CloseBoxRequest, ExecBoxGachaRequest, GetBoxListRequest } from "./box-gacha.contracts";
import type {
    BoxExecResult,
    BoxInfoView,
    BoxListResult,
    DrawnBoxRewardState,
    PlayerBoxGachaState,
} from "./box-gacha.models";
import { BoxGachaPolicy } from "./box-gacha.policy";
import type { BoxGachaRepository } from "./box-gacha.repository";

export class BoxGachaService {
    private readonly policy: BoxGachaPolicy;

    constructor(
        private readonly identityService: IdentityService,
        private readonly playerService: PlayerService,
        private readonly repository: BoxGachaRepository,
        private readonly catalog: BoxGachaCatalog,
        private readonly rewardService: RewardService,
        private readonly clock: Clock,
        random: RandomSource,
        private readonly events: EventRegistry,
    ) {
        this.policy = new BoxGachaPolicy(random);
    }

    getBoxList(input: GetBoxListRequest): BoxListResult {
        const player = this.requirePlayer(input.viewerId);
        const gacha = this.requireGacha(input.boxGachaId);
        this.events.assertBoxGachaAvailable(gacha.id, this.clock.now());
        return { viewerId: input.viewerId, allBoxInfo: this.getAllBoxInfo(player.id, gacha) };
    }

    close(input: CloseBoxRequest): BoxListResult {
        const player = this.requirePlayer(input.viewerId);
        const gacha = this.requireGacha(input.boxGachaId);
        this.events.assertBoxGachaAvailable(gacha.id, this.clock.now());
        this.requireBox(gacha, input.boxId);
        return this.repository.transaction(() => {
            const state = this.repository.getBoxState(player.id, gacha.id, input.boxId);
            if (!state) throw new InvalidRequestError("Box doesn't exist");
            if (state.isClosed) throw new InvalidRequestError("Box is already closed.");
            this.repository.setBoxState({ ...state, isClosed: true });
            return { viewerId: input.viewerId, allBoxInfo: this.getAllBoxInfo(player.id, gacha) };
        });
    }

    exec(input: ExecBoxGachaRequest): BoxExecResult {
        const player = this.requirePlayer(input.viewerId);
        if (!Number.isSafeInteger(input.number) || input.number <= 0) {
            throw new InvalidRequestError("Invalid draw count.");
        }
        const gacha = this.requireGacha(input.boxGachaId);
        this.events.assertBoxGachaAvailable(gacha.id, this.clock.now());
        const box = this.requireBox(gacha, input.boxId);

        return this.repository.transaction(() => {
            const currentState = this.repository.getBoxState(player.id, gacha.id, box.boxId);
            if (currentState?.isClosed) throw new InvalidRequestError("Box is closed.");
            const drawnBefore = this.repository.getDrawnRewards(player.id, gacha.id, box.boxId);
            const totalRemaining = Math.max(0, box.availableCount - this.sumDrawn(drawnBefore));
            if (totalRemaining <= 0) throw new InvalidRequestError("Box is empty.");
            const maximumPossibleDraws = Math.min(input.number, totalRemaining);
            const currencyBefore = this.repository.getItemAmount(player.id, gacha.redeemItemId);
            const maximumCost = maximumPossibleDraws * gacha.redeemItemCount;
            if (currencyBefore < maximumCost) throw new InvalidRequestError("Not enough pull currency.");

            const session = this.policy.draw(
                box,
                drawnBefore,
                input.number,
                input.stopOnFeaturedRewards,
            );
            if (session.actualDrawCount <= 0) throw new InvalidRequestError("Box is empty.");
            const actualCost = session.actualDrawCount * gacha.redeemItemCount;
            this.repository.setItemAmount(player.id, gacha.redeemItemId, currencyBefore - actualCost);

            const mergedDrawn = new Map(drawnBefore.map((reward) => [reward.rewardId, reward.number]));
            for (const reward of session.drawnRewards) {
                const next = (mergedDrawn.get(reward.rewardId) ?? 0) + reward.number;
                mergedDrawn.set(reward.rewardId, next);
                this.repository.setDrawnReward(player.id, gacha.id, box.boxId, reward.rewardId, next);
            }

            const rewards = this.toPlayerRewards(box, session.drawnRewards);
            const grant = this.rewardService.grantWithinTransaction(player.id, rewards);
            const remainingNumber = Math.max(0, box.availableCount - this.sumDrawn(
                [...mergedDrawn.entries()].map(([rewardId, number]) => ({ rewardId, number })),
            ));
            const nextState: PlayerBoxGachaState = {
                playerId: player.id,
                gachaId: gacha.id,
                boxId: box.boxId,
                resetTimes: currentState?.resetTimes ?? 0,
                remainingNumber,
                isClosed: remainingNumber === 0,
            };
            this.repository.setBoxState(nextState);
            const playerInfo = this.repository.getPlayerInfo(player.id);
            if (!playerInfo) throw new InvariantError("Player disappeared during box gacha draw.");
            return {
                viewerId: input.viewerId,
                drawnRewards: session.drawnRewards,
                allBoxInfo: this.getAllBoxInfo(player.id, gacha),
                grant,
                player: playerInfo,
                pullCurrencyId: gacha.redeemItemId,
                pullCurrencyAmount: this.repository.getItemAmount(player.id, gacha.redeemItemId),
            };
        });
    }

    private getAllBoxInfo(playerId: number, gacha: BoxGachaDefinition): BoxInfoView[] {
        return gacha.boxes.map((box) => {
            const state = this.repository.getBoxState(playerId, gacha.id, box.boxId);
            return {
                boxId: box.boxId,
                resetTimes: state?.resetTimes ?? 0,
                drawnRewards: this.repository.getDrawnRewards(playerId, gacha.id, box.boxId),
                isClosed: state?.isClosed ?? false,
            };
        });
    }

    private toPlayerRewards(box: BoxGachaBoxDefinition, drawn: readonly DrawnBoxRewardState[]): Reward[] {
        const definitions = new Map(box.rewards.map((reward) => [reward.rewardId, reward]));
        const rewards: Reward[] = [];
        for (const draw of drawn) {
            const definition = definitions.get(draw.rewardId);
            if (!definition) throw new InvariantError(`Unknown box reward ${draw.rewardId}.`);
            const amount = definition.count * draw.number;
            switch (definition.type) {
                case BoxGachaRewardType.ITEM:
                    if (definition.id === undefined) throw new InvariantError("Box item reward missing id.");
                    rewards.push({ type: RewardType.ITEM, id: definition.id, count: amount });
                    break;
                case BoxGachaRewardType.EQUIPMENT:
                    if (definition.id === undefined) throw new InvariantError("Box equipment reward missing id.");
                    rewards.push({ type: RewardType.EQUIPMENT, id: definition.id, count: amount });
                    break;
                case BoxGachaRewardType.EMPTY:
                    break;
                case BoxGachaRewardType.MANA:
                    rewards.push({ type: RewardType.MANA, count: amount });
                    break;
                case BoxGachaRewardType.EXP:
                    rewards.push({ type: RewardType.EXP, count: amount });
                    break;
                case BoxGachaRewardType.CHARACTER:
                    if (definition.id === undefined) throw new InvariantError("Box character reward missing id.");
                    for (let index = 0; index < amount; index += 1) {
                        rewards.push({ type: RewardType.CHARACTER, id: definition.id });
                    }
                    break;
                default: {
                    const exhaustive: never = definition.type;
                    throw new InvariantError(`Unsupported box reward type ${String(exhaustive)}.`);
                }
            }
        }
        return rewards;
    }

    private sumDrawn(drawn: readonly DrawnBoxRewardState[]): number {
        return drawn.reduce((sum, reward) => sum + reward.number, 0);
    }

    private requireGacha(id: number): BoxGachaDefinition {
        const gacha = this.catalog.findById(id);
        if (!gacha) throw new InvalidRequestError("Invalid box gacha id.");
        return gacha;
    }

    private requireBox(gacha: BoxGachaDefinition, boxId: number): BoxGachaBoxDefinition {
        const box = gacha.boxes.find((entry) => entry.boxId === boxId);
        if (!box) throw new InvalidRequestError("Invalid box ID.");
        return box;
    }

    private requirePlayer(viewerId: number): { id: number } {
        const viewer = this.identityService.requireViewerSession(viewerId);
        return this.playerService.requireForAccount(viewer.accountId);
    }
}
