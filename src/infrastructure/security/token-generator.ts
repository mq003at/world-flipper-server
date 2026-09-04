import { randomBytes, randomInt } from "node:crypto";

export interface TokenGenerator {
    createSessionToken(): string;
    createViewerId(): number;
}

export class CryptoTokenGenerator implements TokenGenerator {
    createSessionToken(): string {
        return randomBytes(54).toString("base64");
    }

    createViewerId(): number {
        return randomInt(100_000_000, 1_000_000_000);
    }
}
