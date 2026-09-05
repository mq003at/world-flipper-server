export interface TutorialConfig {
    completionTriggerId: number;
    tutorialGachaCharacterIds: readonly number[];
    tutorialGachaMovieId: string;
    tutorialGachaSeed: number;
    freeCharacterId: number;
    postGachaVmoneyReward: number;
}

export const DEFAULT_TUTORIAL_CONFIG: TutorialConfig = {
    completionTriggerId: 12,
    tutorialGachaCharacterIds: [
        251001,
        251002,
        251003,
        251004,
        251005,
        251006,
        251007,
        251008,
    ],
    tutorialGachaMovieId: "normal_guarantee",
    tutorialGachaSeed: 10007656,
    freeCharacterId: 243001,
    postGachaVmoneyReward: 1500,
};
