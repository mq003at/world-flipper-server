export enum Element {
    FIRE = 0,
    WATER = 1,
    LIGHTNING = 2,
    WIND = 3,
    LIGHT = 4,
    DARK = 5,
}

export interface CharacterDefinition {
    id: number;
    name?: string;
    rarity: number;
    element: Element;
    skillCount: number;
}

export interface CharacterCatalog {
    findById(characterId: number): CharacterDefinition | null;
}
