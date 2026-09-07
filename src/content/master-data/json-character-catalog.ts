import { readFileSync } from "node:fs";
import path from "node:path";
import {
    Element,
    type CharacterCatalog,
    type CharacterDefinition,
} from "./character-catalog";

interface RawCharacterDefinition {
    name?: string;
    rarity: number;
    element: number;
    skill_count: number;
}

type RawCharacterCatalog = Record<string, RawCharacterDefinition>;

export class JsonCharacterCatalog implements CharacterCatalog {
    private readonly characters: Map<number, CharacterDefinition>;

    constructor(masterDataDir: string) {
        const filePath = path.join(masterDataDir, "character.json");
        const parsed = JSON.parse(readFileSync(filePath, "utf8")) as RawCharacterCatalog;

        this.characters = new Map(
            Object.entries(parsed).map(([rawId, raw]) => {
                const id = Number(rawId);
                return [
                    id,
                    {
                        id,
                        ...(raw.name?.trim() ? { name: raw.name.trim() } : {}),
                        rarity: raw.rarity,
                        element: raw.element as Element,
                        skillCount: raw.skill_count,
                    },
                ];
            }),
        );
    }

    findById(characterId: number): CharacterDefinition | null {
        return this.characters.get(characterId) ?? null;
    }
}
