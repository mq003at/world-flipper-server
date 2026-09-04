import { randomInt } from "node:crypto";
import type { RandomSource } from "./random-source";

export class CryptoRandomSource implements RandomSource {
    nextInt(minInclusive: number, maxExclusive: number): number {
        return randomInt(minInclusive, maxExclusive);
    }
}
