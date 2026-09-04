import type { GrantedTutorialCharacter } from "./tutorial.repository";

export interface TutorialBaseResult {
    kind: "basic";
    viewerId: number;
    step: number;
    now: Date;
}

export interface TutorialGachaResult {
    kind: "gacha";
    viewerId: number;
    step: number;
    now: Date;
    gachaId: number;
    freeVmoney: number;
    granted: GrantedTutorialCharacter;
    movieId: string;
    seed: number;
}

export interface TutorialFreeCharacterResult {
    kind: "free-character";
    viewerId: number;
    step: number;
    now: Date;
    freeVmoney: number;
    granted: GrantedTutorialCharacter;
}

export type TutorialUpdateResult =
    | TutorialBaseResult
    | TutorialGachaResult
    | TutorialFreeCharacterResult;
