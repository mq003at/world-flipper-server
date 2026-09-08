import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createDatabase } from "../src/infrastructure/database/database";
import { FixedClock } from "../src/infrastructure/clock/fixed-clock";
import { loadGachaRotationConfig } from "../src/modules/gacha/gacha-rotation.config";
import { SeasonalGachaCalendar } from "../src/modules/gacha/seasonal-gacha-calendar";
import { SqliteSeasonRolloverService } from "../src/modules/gacha/season-rollover.service";
import { PlayerFactory } from "../src/modules/player/player.factory";
import { SqlitePlayerRepository } from "../src/modules/player/player.repository.sqlite";

test("season rollover wipes characters and party references while preserving beads, equipment, story, and tutorial", () => {
    const database = createDatabase(":memory:");
    try {
        database.exec(`INSERT INTO accounts (id, app_id, first_login_time, idp_alias, idp_code, idp_id, reg_time, last_login_time, status)
            VALUES (1,'561432','2026-01-01T00:00:00.000Z','guest','guest','rollover-test','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z','active')`);
        const initialClock = new FixedClock(new Date("2026-01-02T00:00:00.000Z"));
        const player = new SqlitePlayerRepository(database).createInitial(1, new PlayerFactory(initialClock).createInitialState());
        const calendar = new SeasonalGachaCalendar(loadGachaRotationConfig(path.resolve("content/live")));
        const rollover = new SqliteSeasonRolloverService(database, calendar, initialClock);
        assert.equal(rollover.ensureCurrent(player.id), false);

        database.exec(`
            UPDATE players SET free_vmoney = 4321, tutorial_step = 90 WHERE id = ${player.id};
            INSERT INTO players_equipment (id,level,enhancement_level,protection,stack,player_id) VALUES (3010007,10,2,0,1,${player.id});
            INSERT INTO players_characters (id,entry_count,evolution_level,over_limit_step,protection,join_time,update_time,exp,stack,mana_board_index,player_id) VALUES (111001,1,0,0,0,'2026-01-02','2026-01-02',100,0,1,${player.id});
            INSERT INTO players_quest_progress (section,quest_id,finished,player_id) VALUES (1,1001,1,${player.id});
            UPDATE players_parties SET character_id_2 = 111001 WHERE player_id = ${player.id};
        `);

        assert.equal(rollover.ensureCurrent(player.id, new Date("2026-07-01T00:00:00+07:00")), true);
        const ids = database.prepare("SELECT id FROM players_characters WHERE player_id = ? ORDER BY id").all(player.id) as Array<{ id: number }>;
        assert.deepEqual(ids.map((row) => row.id), [1]);
        const state = database.prepare("SELECT free_vmoney, tutorial_step, star_crumb FROM players WHERE id = ?").get(player.id) as { free_vmoney: number; tutorial_step: number; star_crumb: number };
        assert.deepEqual(state, { free_vmoney: 4321, tutorial_step: 90, star_crumb: 4200 });
        assert.equal(rollover.ensureCurrent(player.id, new Date("2026-07-02T00:00:00+07:00")), false);
        assert.equal((database.prepare("SELECT star_crumb FROM players WHERE id = ?").get(player.id) as { star_crumb: number }).star_crumb, 4200);
        assert.equal((database.prepare("SELECT COUNT(*) AS count FROM players_equipment WHERE player_id = ?").get(player.id) as { count: number }).count, 1);
        assert.equal((database.prepare("SELECT COUNT(*) AS count FROM players_quest_progress WHERE player_id = ?").get(player.id) as { count: number }).count, 1);
        assert.equal((database.prepare("SELECT COUNT(*) AS count FROM players_parties WHERE player_id = ? AND character_id_2 IS NOT NULL").get(player.id) as { count: number }).count, 0);
    } finally {
        database.close();
    }
});
