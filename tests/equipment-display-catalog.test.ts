import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { JsonDisplayCatalog } from "../src/content/display/json-display-catalog";

const characterCatalog = { findById: () => null, listAll: () => [] } as any;

test("display catalog enriches gacha equipment from master equipment.json", () => {
    const catalog = new JsonDisplayCatalog(path.resolve("content/display"), characterCatalog);
    const equipment = catalog.find("equipment", 5020030);

    assert.equal(equipment.name, "Infernal Axe");
    assert.equal(equipment.rarity, 5);
    assert.equal(equipment.key, "axe_0030");
    assert.equal(equipment.assetPath, "item/equipment/general/axe_0030");
    assert.match(equipment.description ?? "", /renowned commander/);
    assert.deepEqual(equipment.stats?.["1"], { hp: 330, attack: 134 });
    assert.deepEqual(equipment.stats?.["5"], { hp: 495, attack: 201 });
});

test("missing equipment still has a stable fallback label", () => {
    const catalog = new JsonDisplayCatalog(path.resolve("content/display"), characterCatalog);
    assert.equal(catalog.find("equipment", 9999999).name, "Unknown Equipment #9999999");
});
