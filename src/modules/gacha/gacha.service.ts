import { GachaType, type GachaCatalog, type GachaDefinition } from "../../content/master-data/gacha-catalog";
import type { RandomSource } from "../../infrastructure/random/random-source";
import { InvalidRequestError, InvariantError } from "../../shared/errors/application-error";
import type { IdentityService } from "../identity/identity.service";
import type { PlayerService } from "../player/player.service";
import { RewardType, type Reward } from "../reward/reward.models";
import type { RewardService } from "../reward/reward.service";
import type {
    ExchangeCharacterRequest,
    ExchangeEquipmentRequest,
    ExecuteGachaRequest,
} from "./gacha.contracts";
import {
    GachaExecType,
    GachaPaymentType,
    type ExchangeCharacterResult,
    type ExchangeEquipmentResult,
    type ExecuteGachaResult,
    type GachaPlayerWallet,
    type PlayerGachaCampaignState,
    type PlayerGachaInfoState,
} from "./gacha.models";
import { drawGachaIds, gachaContainsItem, presentCharacterDraw } from "./gacha.policy";
import type { GachaRepository } from "./gacha.repository";

const EXCHANGE_REQUIRED_POINTS = 250;

const CHARACTER_MULTI_TICKET_ID = 999001;
const CHARACTER_SINGLE_TICKET_ID = 999003;
const WEAPON_MULTI_TICKET_ID = 999004;
const WEAPON_SINGLE_TICKET_ID = 999005;

function assertPositiveSafeInteger(value: number, message: string): void {
    if (!Number.isSafeInteger(value) || value <= 0) throw new InvalidRequestError(message);
}

function defaultInfo(gachaId: number): PlayerGachaInfoState {
    return {
        gachaId,
        isDailyFirst: true,
        isAccountFirst: true,
        gachaExchangePoint: 0,
    };
}

function consumeMixedBeads(wallet: GachaPlayerWallet, cost: number): GachaPlayerWallet {
    if (!Number.isSafeInteger(cost) || cost < 0) throw new InvariantError("Invalid gacha cost.");
    if (wallet.freeVmoney + wallet.vmoney < cost) {
        throw new InvalidRequestError("Not enough beads.");
    }
    const freeSpent = Math.min(wallet.freeVmoney, cost);
    const paidSpent = cost - freeSpent;
    return {
        freeVmoney: wallet.freeVmoney - freeSpent,
        vmoney: wallet.vmoney - paidSpent,
    };
}

export class GachaService {
    constructor(
        private readonly identityService: IdentityService,
        private readonly playerService: PlayerService,
        private readonly repository: GachaRepository,
        private readonly catalog: GachaCatalog,
        private readonly rewardService: RewardService,
        private readonly random: RandomSource,
    ) {}

    execute(input: ExecuteGachaRequest): ExecuteGachaResult {
        const player = this.requirePlayer(input.viewerId);
        const gacha = this.requireGacha(input.gachaId);

        return this.repository.transaction(() => {
            let wallet = this.repository.getWallet(player.id);
            if (!wallet) throw new InvariantError("No player bound to account.");

            const previousInfo = this.repository.findGachaInfo(player.id, gacha.id) ?? defaultInfo(gacha.id);
            const payment = this.consumePayment(player.id, gacha, previousInfo, wallet, input);
            wallet = payment.wallet;

            const drawIds = drawGachaIds(this.random, gacha, payment.pullCount);
            const drawRewards: Reward[] = drawIds.map((id) =>
                gacha.type === GachaType.CHARACTER
                    ? { type: RewardType.CHARACTER, id }
                    : { type: RewardType.EQUIPMENT, id, count: 1 },
            );
            const grant = this.rewardService.grant(player.id, drawRewards);

            const gachaInfo: PlayerGachaInfoState = {
                gachaId: gacha.id,
                isAccountFirst: false,
                isDailyFirst: false,
                gachaExchangePoint: previousInfo.gachaExchangePoint + payment.pullCount,
            };
            this.repository.setWallet(player.id, wallet);
            this.repository.upsertGachaInfo(player.id, gachaInfo);

            const items: Record<string, number> = { ...payment.items };
            for (const character of grant.characters) {
                if (character.duplicateItem) {
                    const key = String(character.duplicateItem.id);
                    items[key] = (items[key] ?? 0) + character.duplicateItem.count;
                }
            }

            const characterDraws = gacha.type === GachaType.CHARACTER
                ? drawIds.map((characterId, index) => {
                      const granted = grant.characters[index];
                      if (!granted) throw new InvariantError("Character reward result mismatch.");
                      return presentCharacterDraw(
                          this.random,
                          this.catalog,
                          gacha,
                          characterId,
                          granted.duplicateItem === undefined
                              ? undefined
                              : {
                                    id: granted.duplicateItem.id,
                                    count: granted.duplicateItem.count,
                                },
                      );
                  })
                : [];
            const equipmentDraws = gacha.type === GachaType.WEAPON
                ? drawIds.map((equipmentId) => ({ equipmentId, treasureUpType: 0 }))
                : [];

            return {
                viewerId: input.viewerId,
                gacha,
                wallet,
                characterDraws,
                equipmentDraws,
                characters: grant.characters,
                equipment: grant.equipment,
                items,
                gachaInfo,
                campaigns: payment.campaigns,
            };
        });
    }

    exchangeCharacter(input: ExchangeCharacterRequest): ExchangeCharacterResult {
        const player = this.requirePlayer(input.viewerId);
        const gacha = this.requireGacha(input.gachaId);
        if (gacha.type !== GachaType.CHARACTER || !gachaContainsItem(gacha, input.characterId)) {
            throw new InvalidRequestError("Character is not exchangeable from this gacha.");
        }

        return this.repository.transaction(() => {
            const info = this.requireExchangeInfo(player.id, gacha.id);
            const updated: PlayerGachaInfoState = {
                ...info,
                gachaExchangePoint: info.gachaExchangePoint - EXCHANGE_REQUIRED_POINTS,
            };
            const grant = this.rewardService.grantOne(player.id, {
                type: RewardType.CHARACTER,
                id: input.characterId,
            });
            const granted = grant.characters[0];
            if (!granted) throw new InvariantError("Character reward result missing.");
            this.repository.upsertGachaInfo(player.id, updated);
            return { viewerId: input.viewerId, granted, gachaInfo: updated };
        });
    }

    exchangeEquipment(input: ExchangeEquipmentRequest): ExchangeEquipmentResult {
        const player = this.requirePlayer(input.viewerId);
        const gacha = this.requireGacha(input.gachaId);
        if (gacha.type !== GachaType.WEAPON || !gachaContainsItem(gacha, input.equipmentId)) {
            throw new InvalidRequestError("Equipment is not exchangeable from this gacha.");
        }

        return this.repository.transaction(() => {
            const info = this.requireExchangeInfo(player.id, gacha.id);
            const updated: PlayerGachaInfoState = {
                ...info,
                gachaExchangePoint: info.gachaExchangePoint - EXCHANGE_REQUIRED_POINTS,
            };
            const grant = this.rewardService.grantOne(player.id, {
                type: RewardType.EQUIPMENT,
                id: input.equipmentId,
                count: 1,
            });
            const granted = grant.equipment[0];
            if (!granted) throw new InvariantError("Equipment reward result missing.");
            this.repository.upsertGachaInfo(player.id, updated);
            return { viewerId: input.viewerId, granted, gachaInfo: updated };
        });
    }

    private consumePayment(
        playerId: number,
        gacha: GachaDefinition,
        info: PlayerGachaInfoState,
        wallet: GachaPlayerWallet,
        input: ExecuteGachaRequest,
    ): {
        wallet: GachaPlayerWallet;
        pullCount: number;
        items: Record<string, number>;
        campaigns: PlayerGachaCampaignState[];
    } {
        const paymentType = input.paymentType as GachaPaymentType;
        const execType = input.type as GachaExecType;
        const items: Record<string, number> = {};
        const campaigns: PlayerGachaCampaignState[] = [];

        switch (paymentType) {
            case GachaPaymentType.FREE_VMONEY: {
                const isMulti = execType === GachaExecType.VMONEY_MULTI;
                const cost = isMulti ? gacha.multiCost : gacha.singleCost;
                return {
                    wallet: consumeMixedBeads(wallet, cost),
                    pullCount: isMulti ? 10 : 1,
                    items,
                    campaigns,
                };
            }

            case GachaPaymentType.VMONEY: {
                if (!info.isDailyFirst) {
                    throw new InvalidRequestError("Already did daily paid summon.");
                }
                const legacyFallback = gacha.type === GachaType.CHARACTER ? 50 : 25;
                const cost = gacha.discountCost > 0 ? gacha.discountCost : legacyFallback;
                if (wallet.vmoney < cost) throw new InvalidRequestError("Not enough beads.");
                return {
                    wallet: { ...wallet, vmoney: wallet.vmoney - cost },
                    pullCount: 1,
                    items,
                    campaigns,
                };
            }

            case GachaPaymentType.TICKET: {
                const isMulti = execType === GachaExecType.MULTI_TICKET
                    || execType === GachaExecType.MULTI_WEAPON_TICKET;
                const weapon = gacha.type === GachaType.WEAPON;
                if (execType === GachaExecType.MULTI_WEAPON_TICKET && !weapon) {
                    throw new InvalidRequestError("Weapon ticket used on a character gacha.");
                }
                const ticketId = weapon
                    ? (isMulti ? WEAPON_MULTI_TICKET_ID : WEAPON_SINGLE_TICKET_ID)
                    : (isMulti ? CHARACTER_MULTI_TICKET_ID : CHARACTER_SINGLE_TICKET_ID);
                assertPositiveSafeInteger(
                    Math.max(1, input.numberOfExec),
                    "Invalid ticket execution count.",
                );
                const useTicketCount = Math.max(1, Math.trunc(input.numberOfExec));
                const current = this.repository.getItemAmount(playerId, ticketId) ?? 0;
                const remaining = current - useTicketCount;
                if (remaining < 0) throw new InvalidRequestError("Not enough tickets.");
                this.repository.setItemAmount(playerId, ticketId, remaining);
                items[String(ticketId)] = remaining;
                return {
                    wallet,
                    pullCount: useTicketCount * (isMulti ? 10 : 1),
                    items,
                    campaigns,
                };
            }

            case GachaPaymentType.CAMPAIGN: {
                const isMulti = execType === GachaExecType.CAMPAIGN_MULTI;
                const campaignId = this.catalog.findCampaignId(gacha.id);
                if (campaignId === null) {
                    throw new InvalidRequestError("No gacha campaign assigned to gacha.");
                }
                const campaign = this.repository.findCampaign(playerId, gacha.id, campaignId) ?? {
                    gachaId: gacha.id,
                    campaignId,
                    count: 1,
                };
                if (campaign.count <= 0) {
                    throw new InvalidRequestError("Already redeemed campaign for this period.");
                }
                const consumed = { ...campaign, count: 0 };
                this.repository.upsertCampaign(playerId, consumed);
                campaigns.push(consumed);
                return {
                    wallet,
                    pullCount: isMulti ? 10 : 1,
                    items,
                    campaigns,
                };
            }

            default:
                throw new InvalidRequestError("Invalid payment type.");
        }
    }

    private requireExchangeInfo(playerId: number, gachaId: number): PlayerGachaInfoState {
        const info = this.repository.findGachaInfo(playerId, gachaId);
        if (!info) throw new InvalidRequestError("No data for gacha with provided id.");
        if (info.gachaExchangePoint < EXCHANGE_REQUIRED_POINTS) {
            throw new InvalidRequestError("Not enough exchange points.");
        }
        return info;
    }

    private requirePlayer(viewerId: number): { id: number } {
        const viewer = this.identityService.requireViewerSession(viewerId);
        return this.playerService.requireForAccount(viewer.accountId);
    }

    private requireGacha(gachaId: number): GachaDefinition {
        const gacha = this.catalog.findById(gachaId);
        if (!gacha) throw new InvalidRequestError("Gacha doesn't exist.");
        return gacha;
    }
}
