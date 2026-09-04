import type { PaymentPack } from "./payment.models";

// Real Global pack sizes are retained so the client UI remains familiar, but every
// pack is a fan-server grant: no currency, receipt, Google Play, or App Store charge occurs.
export const FREE_PAYMENT_PACKS: readonly PaymentPack[] = [
    { id: 1, productId: "fanserver.worldflipper.beads.70", name: "70 Lodestar Beads", paidVmoney: 70 },
    { id: 2, productId: "fanserver.worldflipper.beads.210", name: "210 Lodestar Beads", paidVmoney: 210 },
    { id: 3, productId: "fanserver.worldflipper.beads.320", name: "320 Lodestar Beads", paidVmoney: 320 },
    { id: 4, productId: "fanserver.worldflipper.beads.800", name: "800 Lodestar Beads", paidVmoney: 800 },
    { id: 5, productId: "fanserver.worldflipper.beads.1500", name: "1500 Lodestar Beads", paidVmoney: 1500 },
    { id: 6, productId: "fanserver.worldflipper.beads.2450", name: "2450 Lodestar Beads", paidVmoney: 2450 },
    { id: 7, productId: "fanserver.worldflipper.beads.5100", name: "5100 Lodestar Beads", paidVmoney: 5100 },
];

export function findPaymentPack(identifier: string | number): PaymentPack | null {
    if (typeof identifier === "number") {
        return FREE_PAYMENT_PACKS.find((pack) => pack.id === identifier) ?? null;
    }
    const numeric = Number(identifier);
    return FREE_PAYMENT_PACKS.find(
        (pack) => pack.productId === identifier || (Number.isSafeInteger(numeric) && pack.id === numeric),
    ) ?? null;
}
