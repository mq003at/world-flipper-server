import { serializeClientDate } from "../../protocol/worldflipper/client-time";
import { presentRewardGrant } from "../reward/reward.presenter";
import type { Reward } from "../reward/reward.models";
import type { MailClaimAllResult, MailClaimResult, PlayerMail } from "./mail.models";

function presentReward(reward: Reward): Record<string, unknown> {
    return { ...reward };
}

export function presentMail(mail: PlayerMail): Record<string, unknown> {
    return {
        id: mail.id,
        mail_id: mail.id,
        title: mail.title,
        message: mail.body,
        body: mail.body,
        create_time: serializeClientDate(mail.createdAt),
        expire_time: mail.expiresAt ? serializeClientDate(mail.expiresAt) : null,
        is_read: mail.readAt !== null,
        is_received: mail.claimedAt !== null,
        reward_list: mail.rewards.map(presentReward),
    };
}

export function presentMailClaim(result: MailClaimResult): Record<string, unknown> {
    return {
        mail_id: result.mailId,
        ...presentRewardGrant(result.grant, result.viewerId),
    };
}

export function presentMailClaimAll(result: MailClaimAllResult): Record<string, unknown> {
    return {
        claimed_mail_id_list: result.mailIds,
        ...(result.grant ? presentRewardGrant(result.grant, result.viewerId) : {
            user_info: { free_mana: 0, free_vmoney: 0, exp_pool: 0 },
            character_list: [],
            joined_character_id_list: [],
            equipment_list: [],
            items: {},
        }),
    };
}
