import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadStarSliverShopConfig } from "../src/modules/shop/star-sliver-shop.config";

interface CharacterRow { rarity: number }

const root = process.cwd();
const characters = JSON.parse(readFileSync(path.join(root, "content/master/character.json"), "utf8")) as Record<string, CharacterRow>;
const config = loadStarSliverShopConfig(path.join(root, "content/live"));
const result: Record<string, unknown> = {};

for (const [rawId, character] of Object.entries(characters)) {
    if (character.rarity !== 4 && character.rarity !== 5) continue;
    const characterId = Number(rawId);
    const shopItemId = 10_000_000 + characterId;
    result[String(shopItemId)] = {
        costs: [{ id: config.currencyItemId, amount: config.characterPrices[String(character.rarity) as "4" | "5"] }],
        rewards: [{ type: 3, id: characterId, count: 1 }],
        availableFrom: "2016-10-26 15:00:00",
        availableUntil: null,
        stock: -1,
    };
}
for (const gem of config.astralGems) {
    result[String(gem.shopItemId)] = {
        costs: [{ id: config.currencyItemId, amount: gem.price }],
        rewards: [{ type: 0, id: gem.itemId, count: 1 }],
        availableFrom: "2016-10-26 15:00:00",
        availableUntil: null,
        stock: gem.stock,
    };
}

const serialized = `${JSON.stringify(result, null, 4)}\n`;
for (const relative of ["assets/star_grain_shop.json", "content/master/star_grain_shop.json"]) {
    writeFileSync(path.join(root, relative), serialized, "utf8");
    console.log(`Star Sliver client master written: ${relative}`);
}
