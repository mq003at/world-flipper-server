import type { Clock } from "../../infrastructure/clock/clock";
import type { GameplayEvent } from "../../live/gameplay-events/gameplay-event";
import type { LifecyclePeriods } from "../../live/time/lifecycle-periods";
import type { ScheduleService } from "../../live/schedule/schedule.service";
import type { SeasonEconomyPolicy } from "../../live/economy/season-economy.policy";
import { InvalidRequestError, InvariantError } from "../../shared/errors/application-error";
import type { IdentityService } from "../identity/identity.service";
import type { PlayerService } from "../player/player.service";
import type { RewardGrantResult } from "../reward/reward.models";
import type { RewardService } from "../reward/reward.service";
import type { MissionCatalog } from "./mission.catalog";
import type { MissionDefinition, MissionProgressState, MissionProgressView } from "./mission.models";
import type { MissionRepository } from "./mission.repository";

export class MissionService {
    constructor(
        private readonly identityService: IdentityService,
        private readonly playerService: PlayerService,
        private readonly repository: MissionRepository,
        private readonly catalog: MissionCatalog,
        private readonly rewardService: RewardService,
        private readonly clock: Clock,
        private readonly lifecycle: LifecyclePeriods,
        private readonly schedule: ScheduleService,
        private readonly economy: SeasonEconomyPolicy,
    ) {}

    getProgress(viewerId: number, periods?: readonly string[]): MissionProgressView[] {
        const player = this.requirePlayer(viewerId);
        const now = this.clock.now();
        const requested = periods ? new Set(periods) : null;
        return this.repository.transaction(() => this.catalog.list()
            .filter((definition) => requested === null || requested.has(definition.period))
            .filter((definition) => this.isDefinitionActive(definition, now))
            .map((definition) => {
                const periodKey = this.periodKey(definition, now);
                const existing = this.repository.get(player.id, definition.id, periodKey);
                const state = existing ?? this.createZeroState(player.id, definition.id, periodKey, now);
                if (!existing) this.repository.upsert(state);
                return { definition, state };
            }));
    }

    handleGameplayEvent(event: GameplayEvent): void {
        const now = this.clock.now();
        const definitions = this.catalog.list().filter(
            (definition) => definition.eventType === event.type
                && this.isDefinitionActive(definition, now)
                && this.matchesFilter(definition, event),
        );
        if (definitions.length === 0) return;

        this.repository.transaction(() => {
            for (const definition of definitions) {
                const periodKey = this.periodKey(definition, now);
                const state = this.repository.get(event.playerId, definition.id, periodKey)
                    ?? this.createZeroState(event.playerId, definition.id, periodKey, now);
                const eventKey = this.eventKey(event, now);
                if (eventKey !== null && state.lastEventKey === eventKey) continue;
                if (state.claimedAt || state.completedAt) {
                    if (!this.repository.get(event.playerId, definition.id, periodKey)) {
                        this.repository.upsert(state);
                    }
                    continue;
                }
                const progress = this.nextProgress(definition, state.progress, event);
                const completedAt = progress >= definition.target ? now : null;
                this.repository.upsert({ ...state, progress, completedAt, lastEventKey: eventKey, updatedAt: now });
            }
        });
    }

    claim(viewerId: number, missionId: number): { mission: MissionProgressView; grant: RewardGrantResult } {
        const player = this.requirePlayer(viewerId);
        const definition = this.catalog.findById(missionId);
        if (!definition) throw new InvalidRequestError("Mission does not exist.");
        const now = this.clock.now();
        if (!this.isDefinitionActive(definition, now)) {
            throw new InvalidRequestError("Mission is not active.");
        }
        const periodKey = this.periodKey(definition, now);

        return this.repository.transaction(() => {
            const state = this.repository.get(player.id, missionId, periodKey);
            if (!state || state.completedAt === null) throw new InvalidRequestError("Mission is not complete.");
            if (state.claimedAt !== null) throw new InvalidRequestError("Mission reward already claimed.");
            const rewards = definition.rewardPolicy === "time-gated"
                ? this.economy.scaleTimeGatedRewards(definition.rewards)
                : [...definition.rewards];
            const grant = this.rewardService.grantWithinTransaction(player.id, rewards);
            this.repository.markClaimed(player.id, missionId, periodKey, now);
            const claimed = this.repository.get(player.id, missionId, periodKey);
            if (!claimed) throw new InvariantError("Mission disappeared after claim.");
            return { mission: { definition, state: claimed }, grant };
        });
    }

    private isDefinitionActive(definition: MissionDefinition, now: Date): boolean {
        return definition.scheduleId === undefined || this.schedule.isActive(definition.scheduleId, now);
    }

    private periodKey(definition: MissionDefinition, now: Date): string {
        switch (definition.period) {
            case "daily": return `daily:${this.lifecycle.dailyKey(now)}`;
            case "weekly": return this.lifecycle.weeklyKey(now);
            case "regular": return "regular";
        }
    }

    private createZeroState(playerId: number, missionId: number, periodKey: string, now: Date): MissionProgressState {
        return { playerId, missionId, periodKey, progress: 0, completedAt: null, claimedAt: null, lastEventKey: null, updatedAt: now };
    }

    private nextProgress(definition: MissionDefinition, current: number, event: GameplayEvent): number {
        const value = this.eventValue(event);
        const next = definition.progressMode === "count"
            ? current + 1
            : definition.progressMode === "sum"
                ? current + value
                : Math.max(current, value);
        return Math.min(definition.target, Math.max(0, Math.trunc(next)));
    }

    private eventKey(event: GameplayEvent, now: Date): string | null {
        if (event.type === "player.login") return `login:${this.lifecycle.dailyKey(now)}`;
        return null;
    }

    private eventValue(event: GameplayEvent): number {
        switch (event.type) {
            case "gacha.drawn": return event.pullCount;
            case "shop.purchased": return event.quantity;
            case "quest.completed": return event.clearRank;
            case "player.login": return 1;
        }
    }

    private matchesFilter(definition: MissionDefinition, event: GameplayEvent): boolean {
        const filter = definition.filter;
        if (!filter) return true;
        if (event.type === "quest.completed") {
            if (filter.questId !== undefined && filter.questId !== event.questId) return false;
            if (filter.questCategory !== undefined && filter.questCategory !== event.category) return false;
        }
        if (event.type === "gacha.drawn" && filter.gachaId !== undefined && filter.gachaId !== event.gachaId) {
            return false;
        }
        if (event.type === "shop.purchased") {
            if (filter.shopType !== undefined && filter.shopType !== event.shopType) return false;
            if (filter.shopItemId !== undefined && filter.shopItemId !== event.shopItemId) return false;
        }
        return true;
    }

    private requirePlayer(viewerId: number): { id: number } {
        const viewer = this.identityService.requireViewerSession(viewerId);
        return this.playerService.requireForAccount(viewer.accountId);
    }
}
