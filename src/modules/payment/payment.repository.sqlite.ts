import type { DatabaseConnection } from "../../infrastructure/database/database";
import type { PaymentGrantRecord } from "./payment.models";
import type { PaymentRepository } from "./payment.repository";

export class SqlitePaymentRepository implements PaymentRepository {
    constructor(private readonly database: DatabaseConnection) {}

    getPaidVmoney(playerId: number): number | null {
        const row = this.database.prepare("SELECT vmoney FROM players WHERE id = ?").get(playerId) as
            | { vmoney: number }
            | undefined;
        return row?.vmoney ?? null;
    }

    setPaidVmoney(playerId: number, amount: number): void {
        this.database.prepare("UPDATE players SET vmoney = ? WHERE id = ?").run(amount, playerId);
    }

    findGrantByTransactionId(transactionId: string): PaymentGrantRecord | null {
        const row = this.database
            .prepare(`
                SELECT id, player_id, product_id, paid_vmoney, transaction_id, created_at
                FROM player_payment_grants
                WHERE transaction_id = ?
            `)
            .get(transactionId) as
            | {
                  id: number;
                  player_id: number;
                  product_id: string;
                  paid_vmoney: number;
                  transaction_id: string | null;
                  created_at: string;
              }
            | undefined;
        return row
            ? {
                  id: row.id,
                  playerId: row.player_id,
                  productId: row.product_id,
                  paidVmoney: row.paid_vmoney,
                  transactionId: row.transaction_id,
                  createdAt: new Date(row.created_at),
              }
            : null;
    }

    insertGrant(input: {
        playerId: number;
        productId: string;
        paidVmoney: number;
        transactionId: string | null;
        createdAt: Date;
    }): PaymentGrantRecord {
        const result = this.database
            .prepare(`
                INSERT INTO player_payment_grants (
                    player_id, product_id, paid_vmoney, transaction_id, created_at
                ) VALUES (?, ?, ?, ?, ?)
            `)
            .run(
                input.playerId,
                input.productId,
                input.paidVmoney,
                input.transactionId,
                input.createdAt.toISOString(),
            );
        return {
            id: Number(result.lastInsertRowid),
            ...input,
        };
    }

    transaction<T>(work: () => T): T {
        return this.database.transaction(work)();
    }
}
