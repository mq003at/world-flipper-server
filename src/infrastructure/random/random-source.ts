export interface RandomSource {
    nextInt(minInclusive: number, maxExclusive: number): number;
}
