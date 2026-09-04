import type { PaymentGrantRecord } from "./payment.models";

export interface PaymentRepository {
    getPaidVmoney(playerId: number): number | null;
    setPaidVmoney(playerId: number, amount: number): void;
    findGrantByTransactionId(transactionId: string): PaymentGrantRecord | null;
    insertGrant(input: {
        playerId: number;
        productId: string;
        paidVmoney: number;
        transactionId: string | null;
        createdAt: Date;
    }): PaymentGrantRecord;
    transaction<T>(work: () => T): T;
}
