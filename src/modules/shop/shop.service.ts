import {
    ShopItemRewardType,
    ShopItemUserCostType,
    ShopType,
    type ShopCatalog,
    type ShopItemDefinition,
} from "../../content/master-data/shop-catalog";
import type { Clock } from "../../infrastructure/clock/clock";
import { LifecyclePeriods } from "../../live/time/lifecycle-periods";
import type { ShopAvailabilityPolicy } from "./shop-availability.policy";
import { NOOP_GAMEPLAY_EVENT_SINK, type GameplayEventSink } from "../../live/gameplay-events/gameplay-event-sink";
import { InvalidRequestError, InvariantError } from "../../shared/errors/application-error";
import type { IdentityService } from "../identity/identity.service";
import type { PlayerService } from "../player/player.service";
import { RewardType, type Reward } from "../reward/reward.models";
import type { RewardService } from "../reward/reward.service";
import type { BuyShopItemRequest, GetSalesListRequest } from "./shop.contracts";
import type { ShopBuyResult, ShopPlayerState, ShopPurchaseState, ShopSale } from "./shop.models";
import type { ShopRepository } from "./shop.repository";
import type { StarSliverShopCatalog } from "./star-sliver-shop.catalog";

function requirePositiveInteger(value: number, message: string): number {
    if (!Number.isSafeInteger(value) || value <= 0) throw new InvalidRequestError(message);
    return value;
}

export class ShopService {
    constructor(
        private readonly identityService: IdentityService,
        private readonly playerService: PlayerService,
        private readonly repository: ShopRepository,
        private readonly catalog: ShopCatalog,
        private readonly rewardService: RewardService,
        private readonly clock: Clock,
        private readonly gameplayEvents: GameplayEventSink = NOOP_GAMEPLAY_EVENT_SINK,
        private readonly events?: ShopAvailabilityPolicy,
        private readonly lifecycle: LifecyclePeriods = new LifecyclePeriods(0, 1),
        private readonly starSliverCatalog?: StarSliverShopCatalog,
        private readonly starSliverCurrencyItemId = 990008,
    ) {}

    getSalesList(input: GetSalesListRequest): ShopSale[] {
        const player = this.requirePlayer(input.viewerId);
        const now = this.clock.now();
        const candidates = new Map<string, { shopType: ShopType; item: ShopItemDefinition }>();

        for (const shopType of input.shopTypes) {
            const items = shopType === ShopType.STAR_GRAIN && this.starSliverCatalog
                ? this.starSliverCatalog.list(now)
                : this.catalog.getGenericItems(shopType);
            for (const item of items) {
                candidates.set(`${shopType}:${item.id}`, { shopType, item });
            }
        }
        for (const categoryId of input.bossCoinShopCategoryIds) {
            for (const item of this.catalog.getBossCoinItems(categoryId)) {
                candidates.set(`${ShopType.BOSS_COIN}:${item.id}`, {
                    shopType: ShopType.BOSS_COIN,
                    item,
                });
            }
        }
        for (const event of input.eventList) {
            for (const eventId of event.eventIds) {
                if (this.events && !this.events.isEventShopAvailable(event.eventType, eventId, now)) continue;
                for (const item of this.catalog.getEventItems(event.eventType, eventId)) {
                    candidates.set(`${ShopType.EVENT_ITEM}:${item.id}`, {
                        shopType: ShopType.EVENT_ITEM,
                        item,
                    });
                }
            }
        }

        const sales: ShopSale[] = [];
        for (const candidate of candidates.values()) {
            if (this.events?.isItemAvailable && !this.events.isItemAvailable(candidate.shopType, candidate.item, now)) continue;
            const purchase = this.normalizePurchaseState(
                player.id,
                candidate.shopType,
                candidate.item.id,
                this.repository.getPurchaseState(player.id, candidate.shopType, candidate.item.id),
                now,
            );
            const stockQuantity = candidate.item.stock < 0
                ? -1
                : Math.max(0, candidate.item.stock - purchase.totalPurchaseNum);
            sales.push({
                shopType: candidate.shopType,
                item: candidate.item,
                stockQuantity,
                todayPurchaseNum: purchase.todayPurchaseNum,
                thisMonthPurchaseNum: purchase.thisMonthPurchaseNum,
                totalPurchaseNum: purchase.totalPurchaseNum,
            });
        }
        return sales;
    }

    buy(input: BuyShopItemRequest): ShopBuyResult {
        const player = this.requirePlayer(input.viewerId);
        const amount = requirePositiveInteger(input.number, "Invalid purchase amount.");
        const now = this.clock.now();
        const item = input.shopType === ShopType.STAR_GRAIN && this.starSliverCatalog
            ? this.starSliverCatalog.find(input.shopItemId, now)
            : this.catalog.findItem(input.shopType, input.shopItemId);
        if (!item) throw new InvalidRequestError("Shop item with specified id does not exist.");
        if (this.events?.isItemAvailable && !this.events.isItemAvailable(input.shopType, item, now)) {
            throw new InvalidRequestError("Shop item is not active.");
        }
        if (input.shopType === ShopType.EVENT_ITEM && this.events) {
            const reference = this.catalog.findEventReferenceForItem(input.shopItemId);
            if (!reference || !this.events.isEventShopAvailable(reference.eventType, reference.eventId, now)) {
                throw new InvalidRequestError("Event shop is not active.");
            }
        }
        const result = this.repository.transaction(() => {
            const before = this.repository.getPlayerState(player.id);
            if (!before) throw new InvariantError("No players bound to account.");
            const previousPurchase = this.normalizePurchaseState(
                player.id,
                input.shopType,
                input.shopItemId,
                this.repository.getPurchaseState(player.id, input.shopType, input.shopItemId),
                now,
            );
            if (item.stock >= 0 && previousPurchase.totalPurchaseNum + amount > item.stock) {
                throw new InvalidRequestError("Shop item stock exceeded.");
            }

            const nextState = this.consumeUserCost(before, item, amount);
            const touchedItems: Record<string, number> = {};
            for (const cost of item.costs) {
                if (input.shopType === ShopType.STAR_GRAIN && cost.id === this.starSliverCurrencyItemId) {
                    nextState.starCrumb -= cost.amount * amount;
                    if (nextState.starCrumb < 0) {
                        throw new InvalidRequestError("Not enough Star Sliver to purchase shop item.");
                    }
                    // The final client identifies Star Sliver as item 990008 in shop master,
                    // while /load stores its authoritative balance in user_info.star_crumb.
                    touchedItems[String(cost.id)] = nextState.starCrumb;
                    continue;
                }
                const owned = this.repository.getItemAmount(player.id, cost.id);
                const remaining = owned - cost.amount * amount;
                if (remaining < 0) {
                    throw new InvalidRequestError(
                        `Not enough of item with id ${cost.id} to purchase shop item.`,
                    );
                }
                touchedItems[String(cost.id)] = remaining;
            }
            this.repository.setPlayerState(player.id, nextState);
            for (const [itemId, remaining] of Object.entries(touchedItems)) {
                if (input.shopType === ShopType.STAR_GRAIN && Number(itemId) === this.starSliverCurrencyItemId) continue;
                this.repository.setItemAmount(player.id, Number(itemId), remaining);
            }

            const rewards = this.toRewards(item, amount);
            const grant = this.rewardService.grant(player.id, rewards);
            const after = this.repository.getPlayerState(player.id);
            if (!after) throw new InvariantError("Player disappeared during shop purchase.");
            const purchase: ShopPurchaseState = {
                ...previousPurchase,
                todayPurchaseNum: previousPurchase.todayPurchaseNum + amount,
                thisMonthPurchaseNum: previousPurchase.thisMonthPurchaseNum + amount,
                totalPurchaseNum: previousPurchase.totalPurchaseNum + amount,
                updatedAt: now,
            };
            this.repository.setPurchaseState(purchase);

            return {
                viewerId: input.viewerId,
                state: after,
                grant,
                itemList: { ...touchedItems, ...grant.items },
                purchase,
            };
        });
        this.gameplayEvents.publish({
            type: "shop.purchased",
            playerId: player.id,
            shopType: input.shopType,
            shopItemId: input.shopItemId,
            quantity: amount,
        });
        return result;
    }

    private consumeUserCost(
        state: ShopPlayerState,
        item: ShopItemDefinition,
        amount: number,
    ): ShopPlayerState {
        if (!item.userCost) return { ...state };
        const cost = item.userCost.amount * amount;
        const next = { ...state };
        switch (item.userCost.type) {
            case ShopItemUserCostType.BEADS:
                next.freeVmoney -= cost;
                if (next.freeVmoney < 0) throw new InvalidRequestError("Not enough beads to purchase shop item.");
                break;
            case ShopItemUserCostType.MANA:
                next.freeMana -= cost;
                if (next.freeMana < 0) throw new InvalidRequestError("Not enough mana to purchase shop item.");
                break;
            case ShopItemUserCostType.AMITY_SCROLL:
                next.bondToken -= cost;
                if (next.bondToken < 0) {
                    throw new InvalidRequestError("Not enough amity scrolls to purchase shop item.");
                }
                break;
            default:
                throw new InvariantError(`Unsupported shop user cost type ${item.userCost.type}.`);
        }
        return next;
    }

    private toRewards(item: ShopItemDefinition, purchaseAmount: number): Reward[] {
        const rewards: Reward[] = [];
        for (const reward of item.rewards) {
            const count = reward.count ?? 1;
            switch (reward.type) {
                case ShopItemRewardType.ITEM:
                    if (reward.id === undefined) throw new InvariantError("Shop item reward missing id.");
                    rewards.push({ type: RewardType.ITEM, id: reward.id, count: count * purchaseAmount });
                    break;
                case ShopItemRewardType.EXP:
                    rewards.push({ type: RewardType.EXP, count: count * purchaseAmount });
                    break;
                case ShopItemRewardType.MANA:
                    rewards.push({ type: RewardType.MANA, count: count * purchaseAmount });
                    break;
                case ShopItemRewardType.CHARACTER:
                    if (reward.id === undefined) throw new InvariantError("Character shop reward missing id.");
                    for (let index = 0; index < purchaseAmount; index += 1) {
                        rewards.push({ type: RewardType.CHARACTER, id: reward.id });
                    }
                    break;
                case ShopItemRewardType.EQUIPMENT:
                    if (reward.id === undefined) throw new InvariantError("Equipment shop reward missing id.");
                    rewards.push({
                        type: RewardType.EQUIPMENT,
                        id: reward.id,
                        count: count * purchaseAmount,
                    });
                    break;
                default:
                    throw new InvariantError(`Unsupported shop reward type ${reward.type}.`);
            }
        }
        return rewards;
    }

    private normalizePurchaseState(
        playerId: number,
        shopType: ShopType,
        shopItemId: number,
        existing: ShopPurchaseState | null,
        now: Date,
    ): ShopPurchaseState {
        const dayKey = this.lifecycle.dailyKey(now);
        const monthKey = this.lifecycle.monthlyKey(now);
        return {
            playerId,
            shopType,
            shopItemId,
            todayPurchaseNum: existing?.todayPeriodKey === dayKey ? existing.todayPurchaseNum : 0,
            todayPeriodKey: dayKey,
            thisMonthPurchaseNum:
                existing?.monthPeriodKey === monthKey ? existing.thisMonthPurchaseNum : 0,
            monthPeriodKey: monthKey,
            totalPurchaseNum: existing?.totalPurchaseNum ?? 0,
            updatedAt: existing?.updatedAt ?? now,
        };
    }

    private requirePlayer(viewerId: number) {
        const viewer = this.identityService.requireViewerSession(viewerId);
        return this.playerService.requireForAccount(viewer.accountId);
    }
}
