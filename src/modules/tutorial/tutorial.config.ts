export interface TutorialConfig {
    completionTriggerId: number;
    tutorialGachaCharacterIds: readonly number[];
    tutorialGachaSingleCost: number;
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
    // Legacy Starpoint obtains this from gacha.json. The tutorial account starts
    // with 150 free beads and the next tutorial reward is 1500, so keep 150 as
    // the compatibility default until the shared MasterData/gacha module lands.
    tutorialGachaSingleCost: 150,
    tutorialGachaMovieId: "normal_guarantee",
    tutorialGachaSeed: 10007656,
    freeCharacterId: 243001,
    postGachaVmoneyReward: 1500,
};
