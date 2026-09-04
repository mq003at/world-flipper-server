import type { Clock } from "../../infrastructure/clock/clock";
import type { RandomSource } from "../../infrastructure/random/random-source";
import { InvalidRequestError } from "../../shared/errors/application-error";
import type { IdentityService } from "../identity/identity.service";
import type { PlayerService } from "../player/player.service";
import type { TutorialConfig } from "./tutorial.config";
import type {
    FinishTutorialTriggerRequest,
    UpdateTutorialStepRequest,
} from "./tutorial.contracts";
import type { TutorialUpdateResult } from "./tutorial.models";
import type { TutorialRepository } from "./tutorial.repository";

export class TutorialService {
    constructor(
        private readonly identity: IdentityService,
        private readonly players: PlayerService,
        private readonly repository: TutorialRepository,
        private readonly clock: Clock,
        private readonly random: RandomSource,
        private readonly config: TutorialConfig,
    ) {}

    finishTrigger(request: FinishTutorialTriggerRequest): void {
        const viewer = this.identity.requireViewerSession(request.viewerId);
        const player = this.players.requireForAccount(viewer.accountId);

        this.repository.transaction(() => {
            this.repository.addTriggeredTutorialIds(player.id, request.tutorialIds);
        });
    }

    updateStep(request: UpdateTutorialStepRequest): TutorialUpdateResult {
        const viewer = this.identity.requireViewerSession(request.viewerId);
        const player = this.players.requireForAccount(viewer.accountId);
        const triggeredTutorialIds = this.repository.getTriggeredTutorialIds(player.id);

        if (triggeredTutorialIds.includes(this.config.completionTriggerId)) {
            throw new InvalidRequestError("Tutorial already completed");
        }

        const storedNextStep = request.completedStep + 1;
        if ((player.tutorialStep ?? 0) > storedNextStep) {
            throw new InvalidRequestError("Attempt to redo previous tutorial step.");
        }

        const responseStep = storedNextStep + (request.skip ? 11 : 0);
        const now = this.clock.now();

        return this.repository.transaction(() => {
            this.repository.updateProgress(player.id, {
                tutorialStep: storedNextStep,
                tutorialSkipFlag: request.skip,
                ...(request.name === undefined ? {} : { name: request.name }),
            });

            if (responseStep === 15 && request.gachaId !== undefined) {
                const pool = this.config.tutorialGachaCharacterIds;
                const selectedCharacterId = pool[this.random.nextInt(0, pool.length)];
                if (selectedCharacterId === undefined) {
                    throw new InvalidRequestError("Tutorial gacha pool is empty.");
                }

                const granted = this.repository.grantCharacter(
                    player.id,
                    selectedCharacterId,
                    now,
                    2,
                );
                const freeVmoney = player.freeVmoney - this.config.tutorialGachaSingleCost;
                this.repository.setFreeVmoney(player.id, freeVmoney);

                return {
                    kind: "gacha",
                    viewerId: request.viewerId,
                    step: responseStep,
                    now,
                    gachaId: request.gachaId,
                    freeVmoney,
                    granted,
                    movieId: this.config.tutorialGachaMovieId,
                    seed: this.config.tutorialGachaSeed,
                };
            }

            if (responseStep === 16) {
                const freeVmoney = player.freeVmoney + this.config.postGachaVmoneyReward;
                this.repository.setFreeVmoney(player.id, freeVmoney);
                const granted = this.repository.grantCharacter(
                    player.id,
                    this.config.freeCharacterId,
                    now,
                    2,
                );

                return {
                    kind: "free-character",
                    viewerId: request.viewerId,
                    step: responseStep,
                    now,
                    freeVmoney,
                    granted,
                };
            }

            return {
                kind: "basic",
                viewerId: request.viewerId,
                step: responseStep,
                now,
            };
        });
    }
}
