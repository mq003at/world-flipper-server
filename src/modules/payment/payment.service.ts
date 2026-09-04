import type { Clock } from "../../infrastructure/clock/clock";
import { InvalidRequestError, InvariantError } from "../../shared/errors/application-error";
import type { IdentityService } from "../identity/identity.service";
import type { PlayerService } from "../player/player.service";
import { FREE_PAYMENT_PACKS, findPaymentPack } from "./payment.catalog";
import type { PaymentPurchaseRequest } from "./payment.contracts";
import type { PaymentPack, PaymentPurchaseResult } from "./payment.models";
import type { PaymentRepository } from "./payment.repository";

export class PaymentService {
    constructor(
        private readonly identityService: IdentityService,
        private readonly playerService: PlayerService,
        private readonly repository: PaymentRepository,
        private readonly clock: Clock,
    ) {}

    list(viewerId: number): readonly PaymentPack[] {
        this.requirePlayer(viewerId);
        return FREE_PAYMENT_PACKS;
    }

    purchase(input: PaymentPurchaseRequest): PaymentPurchaseResult {
        const player = this.requirePlayer(input.viewerId);
        const pack = findPaymentPack(input.productIdentifier);
        if (!pack) throw new InvalidRequestError("Unknown payment product.");

        return this.repository.transaction(() => {
            const current = this.repository.getPaidVmoney(player.id);
            if (current === null) throw new InvariantError("No players bound to account.");

            if (input.transactionId) {
                const prior = this.repository.findGrantByTransactionId(input.transactionId);
                if (prior) {
                    if (prior.playerId !== player.id || prior.productId !== pack.productId) {
                        throw new InvalidRequestError("Payment transaction id already used.");
                    }
                    return {
                        viewerId: input.viewerId,
                        pack,
                        paidVmoneyAfter: current,
                        addedPaidVmoney: 0,
                        replayed: true,
                    };
                }
            }

            const after = current + pack.paidVmoney;
            this.repository.setPaidVmoney(player.id, after);
            this.repository.insertGrant({
                playerId: player.id,
                productId: pack.productId,
                paidVmoney: pack.paidVmoney,
                transactionId: input.transactionId,
                createdAt: this.clock.now(),
            });
            return {
                viewerId: input.viewerId,
                pack,
                paidVmoneyAfter: after,
                addedPaidVmoney: pack.paidVmoney,
                replayed: false,
            };
        });
    }

    private requirePlayer(viewerId: number) {
        const viewer = this.identityService.requireViewerSession(viewerId);
        return this.playerService.requireForAccount(viewer.accountId);
    }
}
