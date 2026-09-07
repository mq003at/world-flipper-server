import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadConfig } from "../src/app/config";
import { JsonDisplayCatalog } from "../src/content/display/json-display-catalog";
import { JsonCharacterCatalog } from "../src/content/master-data/json-character-catalog";
import { JsonGachaCatalog } from "../src/content/master-data/json-gacha-catalog";
import { SystemClock } from "../src/infrastructure/clock/system-clock";
import { createDatabase } from "../src/infrastructure/database/database";
import { GachaProbabilityService } from "../src/modules/gacha-probability/gacha-probability.service";
import { loadGachaRotationConfig } from "../src/modules/gacha/gacha-rotation.config";
import { SqliteSeasonalGachaRepository } from "../src/modules/gacha/seasonal-gacha.repository.sqlite";
import { SeasonalGachaService } from "../src/modules/gacha/seasonal-gacha.service";

const config = loadConfig();
const liveDir = config.liveContentDir ?? path.resolve("content/live");
const displayDir = config.displayContentDir ?? path.resolve("content/display");
const outputPath = path.resolve(process.argv[2] ?? "var/exports/gacha-probability.json");
const database = createDatabase(config.databasePath);

try {
    const clock = new SystemClock();
    const characterCatalog = new JsonCharacterCatalog(config.masterDataDir);
    const seasonal = new SeasonalGachaService(
        new SqliteSeasonalGachaRepository(database),
        new JsonGachaCatalog(config.masterDataDir),
        loadGachaRotationConfig(liveDir),
        clock,
    );
    const probability = new GachaProbabilityService(
        seasonal,
        new JsonDisplayCatalog(displayDir, characterCatalog),
        clock,
    );
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(probability.activeManifest(), null, 2)}\n`, "utf8");
    console.log(`Probability manifest written: ${outputPath}`);
} finally {
    database.close();
}

