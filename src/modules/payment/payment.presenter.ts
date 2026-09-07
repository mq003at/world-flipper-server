import type { PaymentPack, PaymentPurchaseResult } from "./payment.models";

export function presentPaymentItemList(packs: readonly PaymentPack[]): Record<string, unknown> {
    return {
        payment_item_list: packs.map((pack) => ({
            payment_item_id: pack.id,
            item_id: pack.id,
            product_id: pack.productId,
            store_product_id: pack.productId,
            name: pack.name,
            paid_vmoney: pack.paidVmoney,
            vmoney: pack.paidVmoney,
            free_vmoney: 0,
            price: 0,
            price_string: "FREE",
            formatted_price: "FREE",
            currency: "USD",
            currency_code: "USD",
            is_free: 1,
            free_flag: 1,
            payment_type: 0,
            stock_quantity: -1,
        })),
    };
}

export function presentPaymentPurchase(result: PaymentPurchaseResult): Record<string, unknown> {
    return {
        user_info: {
            vmoney: result.paidVmoneyAfter,
        },
        payment_item_id: result.pack.id,
        product_id: result.pack.productId,
        added_vmoney: result.addedPaidVmoney,
        replayed: result.replayed,
    };
}
