export interface PaymentPack {
    id: number;
    productId: string;
    name: string;
    paidVmoney: number;
}

export interface PaymentGrantRecord {
    id: number;
    playerId: number;
    productId: string;
    paidVmoney: number;
    transactionId: string | null;
    createdAt: Date;
}

export interface PaymentPurchaseResult {
    viewerId: number;
    pack: PaymentPack;
    paidVmoneyAfter: number;
    addedPaidVmoney: number;
    replayed: boolean;
}
