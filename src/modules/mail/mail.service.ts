import type { Clock } from "../../infrastructure/clock/clock";
import type { SeasonEconomyPolicy } from "../../live/economy/season-economy.policy";
import type { ScheduleService } from "../../live/schedule/schedule.service";
import { InvalidRequestError, InvariantError } from "../../shared/errors/application-error";
import type { IdentityService } from "../identity/identity.service";
import type { PlayerService } from "../player/player.service";
import type { Reward } from "../reward/reward.models";
import type { RewardService } from "../reward/reward.service";
import type { MailCatalog } from "./mail.catalog";
import type {
    MailClaimAllResult,
    MailClaimResult,
    MailDefinition,
    MailIndexResult,
    PlayerMail,
} from "./mail.models";
import type { MailRepository } from "./mail.repository";

const PAGE_SIZE = 50;

export class MailService {
    constructor(
        private readonly identityService: IdentityService,
        private readonly playerService: PlayerService,
        private readonly repository: MailRepository,
        private readonly catalog: MailCatalog,
        private readonly rewardService: RewardService,
        private readonly clock: Clock,
        private readonly schedule: ScheduleService,
        private readonly economy: SeasonEconomyPolicy,
    ) {}

    index(viewerId: number, currentPage: number): MailIndexResult {
        const player = this.requirePlayer(viewerId);
        const now = this.clock.now();
        const page = Number.isSafeInteger(currentPage) && currentPage > 0 ? currentPage : 1;
        return this.repository.transaction(() => {
            this.materializeScheduledMail(player.id, now);
            const mail = this.repository.list(player.id, now, PAGE_SIZE, (page - 1) * PAGE_SIZE);
            this.repository.markRead(player.id, mail.map((entry) => entry.id), now);
            return {
                viewerId,
                mail,
                totalCount: this.repository.count(player.id, now),
            };
        });
    }

    hasArrived(viewerId: number): boolean {
        return this.hasArrivedForPlayer(this.requirePlayer(viewerId).id);
    }

    hasArrivedForPlayer(playerId: number): boolean {
        const now = this.clock.now();
        return this.repository.transaction(() => {
            this.materializeScheduledMail(playerId, now);
            return this.repository.hasUnread(playerId, now);
        });
    }

    claim(viewerId: number, mailId: number): MailClaimResult {
        const player = this.requirePlayer(viewerId);
        if (!Number.isSafeInteger(mailId) || mailId <= 0) throw new InvalidRequestError("Invalid mail id.");
        const now = this.clock.now();
        return this.repository.transaction(() => {
            this.materializeScheduledMail(player.id, now);
            const mail = this.repository.findById(player.id, mailId);
            if (!mail) throw new InvalidRequestError("Mail does not exist.");
            this.assertClaimable(mail, now);
            const grant = this.rewardService.grantWithinTransaction(player.id, mail.rewards);
            this.repository.markClaimed(player.id, [mail.id], now);
            return { viewerId, mailId: mail.id, grant };
        });
    }

    claimAll(viewerId: number): MailClaimAllResult {
        const player = this.requirePlayer(viewerId);
        const now = this.clock.now();
        return this.repository.transaction(() => {
            this.materializeScheduledMail(player.id, now);
            const mail = this.repository.listClaimable(player.id, now);
            if (mail.length === 0) return { viewerId, mailIds: [], grant: null };
            const rewards = mail.flatMap((entry) => entry.rewards);
            const grant = this.rewardService.grantWithinTransaction(player.id, rewards);
            this.repository.markClaimed(player.id, mail.map((entry) => entry.id), now);
            return { viewerId, mailIds: mail.map((entry) => entry.id), grant };
        });
    }

    private materializeScheduledMail(playerId: number, now: Date): void {
        for (const definition of this.catalog.list()) {
            if (!this.isDeliverable(definition, now)) continue;
            if (this.repository.findBySourceKey(playerId, definition.sourceKey)) continue;
            const rewards = definition.rewardPolicy === "time-gated"
                ? this.economy.scaleTimeGatedRewards(definition.rewards)
                : [...definition.rewards];
            const expiresAt = definition.expiresAfterHours === undefined
                ? null
                : new Date(now.getTime() + definition.expiresAfterHours * 60 * 60 * 1000);
            this.repository.insert({
                playerId,
                sourceKey: definition.sourceKey,
                title: definition.title,
                body: definition.body,
                rewards,
                createdAt: now,
                expiresAt,
                readAt: null,
                claimedAt: null,
            });
        }
    }

    private isDeliverable(definition: MailDefinition, now: Date): boolean {
        if (!definition.scheduleId) return true;
        const schedule = this.schedule.get(definition.scheduleId);
        if (!schedule) throw new InvariantError(`Mail schedule ${definition.scheduleId} does not exist.`);
        return definition.deliveryWindow === "after-release"
            ? this.schedule.isReleased(definition.scheduleId, now)
            : this.schedule.isActive(definition.scheduleId, now);
    }

    private assertClaimable(mail: PlayerMail, now: Date): void {
        if (mail.claimedAt !== null) throw new InvalidRequestError("Mail reward already claimed.");
        if (mail.expiresAt !== null && now.getTime() >= mail.expiresAt.getTime()) {
            throw new InvalidRequestError("Mail has expired.");
        }
    }

    private requirePlayer(viewerId: number): { id: number } {
        const viewer = this.identityService.requireViewerSession(viewerId);
        return this.playerService.requireForAccount(viewer.accountId);
    }
}
