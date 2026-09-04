import type { Player, PlayerCharacter } from "../player/player.models";

export interface TutorialProgressUpdate {
    tutorialStep: number;
    tutorialSkipFlag: boolean;
    name?: string;
}

export interface GrantedTutorialCharacter {
    characterId: number;
    character: PlayerCharacter;
    isNew: boolean;
}

export interface TutorialRepository {
    getTriggeredTutorialIds(playerId: number): number[];
    addTriggeredTutorialIds(playerId: number, tutorialIds: number[]): void;
    updateProgress(playerId: number, update: TutorialProgressUpdate): Player;
    setFreeVmoney(playerId: number, freeVmoney: number): void;
    grantCharacter(
        playerId: number,
        characterId: number,
        now: Date,
        bondTokenCount?: number,
    ): GrantedTutorialCharacter;
    transaction<T>(work: () => T): T;
}
