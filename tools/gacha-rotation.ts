import { JsonCharacterCatalog } from "../src/content/master-data/json-character-catalog";
import { JsonGachaCatalog } from "../src/content/master-data/json-gacha-catalog";
import { createDatabase } from "../src/infrastructure/database/database";
import { FixedClock } from "../src/infrastructure/clock/fixed-clock";
import { loadConfig } from "../src/app/config";
import { loadGachaRotationConfig } from "../src/modules/gacha/gacha-rotation.config";
import { SqliteSeasonalGachaRepository } from "../src/modules/gacha/seasonal-gacha.repository.sqlite";
import { SeasonalGachaService } from "../src/modules/gacha/seasonal-gacha.service";

const atIndex = process.argv.indexOf("--at");
const at = atIndex >= 0 ? new Date(process.argv[atIndex + 1] ?? "") : new Date();
if (Number.isNaN(at.getTime())) throw new Error("Usage: pnpm gacha:rotate -- --at 2026-09-07T12:00:00+07:00");

const app = loadConfig();
const database = createDatabase(app.databasePath);
try {
    const config = loadGachaRotationConfig(app.liveContentDir!);
    const service = new SeasonalGachaService(
        new SqliteSeasonalGachaRepository(database),
        new JsonGachaCatalog(app.masterDataDir),
        new JsonCharacterCatalog(app.masterDataDir),
        config,
        new FixedClock(at),
    );
    service.ensureCurrentRotation(at);
    const active = service.activeBanners(at);
    console.log(`Materialized rotation at ${at.toISOString()}: ${active.length} active logical banners`);
    for (const banner of active) console.log(`${banner.slot}\t#${banner.shellGachaId}\t${banner.startsAt.toISOString()} -> ${banner.endsAt.toISOString()}`);
} finally {
    database.close();
}
