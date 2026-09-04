import type { Reward, RewardGrantResult } from "../reward/reward.models";

export type MailRewardPolicy = "content-bound" | "time-gated";
export type MailDeliveryWindow = "active" | "after-release";

export interface MailDefinition {
    id: string;
    sourceKey: string;
    title: string;
    body: string;
    rewards: readonly Reward[];
    rewardPolicy: MailRewardPolicy;
    scheduleId?: string;
    deliveryWindow: MailDeliveryWindow;
    expiresAfterHours?: number;
}

export interface PlayerMail {
    id: number;
    playerId: number;
    sourceKey: string;
    title: string;
    body: string;
    rewards: Reward[];
    createdAt: Date;
    expiresAt: Date | null;
    readAt: Date | null;
    claimedAt: Date | null;
}

export interface MailIndexResult {
    viewerId: number;
    mail: PlayerMail[];
    totalCount: number;
}

export interface MailClaimResult {
    viewerId: number;
    mailId: number;
    grant: RewardGrantResult;
}

export interface MailClaimAllResult {
    viewerId: number;
    mailIds: number[];
    grant: RewardGrantResult | null;
}
