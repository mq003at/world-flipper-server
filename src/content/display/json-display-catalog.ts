import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CharacterCatalog } from "../master-data/character-catalog";
import type { SeasonalContentType } from "../../modules/gacha/seasonal-gacha.models";
import type { DisplayCatalog, DisplayCatalogEntry } from "./display-catalog";

type RawEntry = string | Omit<DisplayCatalogEntry, "id">;
type RawEquipmentEntry = Omit<DisplayCatalogEntry, "id" | "assetPath"> & { asset_path?: string };

function load(filePath: string): Map<number, RawEntry> {
    if (!existsSync(filePath)) return new Map();
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, RawEntry>;
    return new Map(Object.entries(parsed).map(([id, entry]) => [Number(id), entry]));
}

export class JsonDisplayCatalog implements DisplayCatalog {
    private readonly characters: Map<number, RawEntry>;
    private readonly equipment: Map<number, RawEntry>;

    constructor(displayDir: string, private readonly characterCatalog: CharacterCatalog) {
        this.characters = load(path.join(displayDir, "characters.en.json"));
        this.equipment = load(path.resolve(displayDir, "..", "master", "equipment.json"));
        for (const [id, override] of load(path.join(displayDir, "equipment.en.json"))) {
            const base = this.equipment.get(id);
            this.equipment.set(id, typeof base === "object" && typeof override === "object" ? { ...base, ...override } : override);
        }
    }

    find(contentType: SeasonalContentType, id: number): DisplayCatalogEntry {
        const raw = (contentType === "character" ? this.characters : this.equipment).get(id);
        const base = contentType === "character" ? this.characterCatalog.findById(id) : null;
        const supplied = typeof raw === "string" ? { name: raw } : raw as RawEquipmentEntry | undefined;
        return {
            id,
            name: supplied?.name?.trim() || base?.name?.trim() || `Unknown ${contentType === "character" ? "Character" : "Equipment"} #${id}`,
            ...(base ? { rarity: base.rarity, element: base.element } : {}),
            ...supplied,
            ...(supplied?.asset_path ? { assetPath: supplied.asset_path } : {}),
        };
    }
}
