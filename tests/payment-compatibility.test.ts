import assert from "node:assert/strict";
import test from "node:test";
import { PaymentService } from "../src/modules/payment/payment.service";
import { presentPaymentItemList } from "../src/modules/payment/payment.presenter";

function service(enabled: boolean) {
    return new PaymentService(
        { requireViewerSession: () => ({ accountId: 1 }) } as any,
        { requireForAccount: () => ({ id: 2 }) } as any,
        {} as any,
        {} as any,
        { freePacksEnabled: enabled },
    );
}

test("payment item list stays empty while the free-pack probe is disabled", () => {
    assert.deepEqual(service(false).list(123), []);
});

test("free-pack probe exposes zero-price packs with explicit free markers", () => {
    const packs = service(true).list(123);
    assert.ok(packs.length > 0);
    const payload = presentPaymentItemList(packs) as { payment_item_list: Array<Record<string, unknown>> };
    assert.equal(payload.payment_item_list[0]?.price, 0);
    assert.equal(payload.payment_item_list[0]?.price_string, "FREE");
    assert.equal(payload.payment_item_list[0]?.is_free, 1);
});
