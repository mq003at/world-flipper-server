import { InvalidRequestError } from "../../shared/errors/application-error";

export interface PaymentItemListRequest {
    viewerId: number;
}

export interface PaymentPurchaseRequest {
    viewerId: number;
    productIdentifier: string | number;
    transactionId: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new InvalidRequestError();
    }
    return value as Record<string, unknown>;
}

function viewerId(body: Record<string, unknown>): number {
    const value = body.viewer_id;
    if (typeof value !== "number" || !Number.isFinite(value)) throw new InvalidRequestError();
    return value;
}

export function parsePaymentItemListRequest(value: unknown): PaymentItemListRequest {
    return { viewerId: viewerId(asRecord(value)) };
}

export function parsePaymentPurchaseRequest(value: unknown): PaymentPurchaseRequest {
    const body = asRecord(value);
    const identifier =
        body.product_id ??
        body.store_product_id ??
        body.sku ??
        body.payment_item_id ??
        body.item_id ??
        body.id;
    if (typeof identifier !== "string" && typeof identifier !== "number") {
        throw new InvalidRequestError("Missing payment product identifier.");
    }
    const rawTransaction =
        body.transaction_id ?? body.purchase_token ?? body.receipt_id ?? body.order_id;
    return {
        viewerId: viewerId(body),
        productIdentifier: identifier,
        transactionId: typeof rawTransaction === "string" && rawTransaction.length > 0
            ? rawTransaction
            : null,
    };
}
