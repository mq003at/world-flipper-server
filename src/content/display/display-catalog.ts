import type { Element } from "../master-data/character-catalog";
import type { SeasonalContentType } from "../../modules/gacha/seasonal-gacha.models";

export interface DisplayCatalogEntry {
    id: number;
    name: string;
    rarity?: number;
    element?: Element;
    title?: string;
    iconPath?: string;
    key?: string;
    assetPath?: string;
    description?: string;
    stats?: Record<string, { hp: number; attack: number }>;
}

export interface DisplayCatalog {
    find(contentType: SeasonalContentType, id: number): DisplayCatalogEntry;
}
