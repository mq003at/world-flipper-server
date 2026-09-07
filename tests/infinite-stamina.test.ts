import assert from "node:assert/strict";
import test from "node:test";
import { createDatabase } from "../src/infrastructure/database/database";
import { FixedClock } from "../src/infrastructure/clock/fixed-clock";
import { PlayerFactory } from "../src/modules/player/player.factory";
import { SqlitePlayerRepository } from "../src/modules/player/player.repository.sqlite";
import { SqliteQuestRepository } from "../src/modules/quest/quest.repository.sqlite";
import {
    FULL_STAMINA_HEAL_TIME,
    MAX_STAMINA,
} from "../src/modules/stamina/infinite-stamina.policy";

function createAccount(database: ReturnType<typeof createDatabase>): number {
    const now = "2026-09-07T00:00:00.000Z";
    const result = database.prepare(`
        INSERT INTO accounts (
            app_id, first_login_time, idp_alias, idp_code, idp_id,
            reg_time, last_login_time, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run("561432", now, "test", "test", `test-${Math.random()}`, now, now, "active");
    return Number(result.lastInsertRowid);
}

test("new and existing players always resolve to 120 stamina", () => {
    const database = createDatabase(":memory:");
    try {
        const repository = new SqlitePlayerRepository(database);
        const initial = new PlayerFactory(new FixedClock(new Date("2026-09-07T00:00:00Z"))).createInitialState();
        assert.equal(initial.player.stamina, MAX_STAMINA);
        const player = repository.createInitial(createAccount(database), initial);
        database.prepare("UPDATE players SET stamina = 0 WHERE id = ?").run(player.id);
        const loaded = repository.findById(player.id);
        assert.equal(loaded?.stamina, MAX_STAMINA);
        assert.equal(loaded?.staminaHealTime.toISOString(), FULL_STAMINA_HEAL_TIME.toISOString());
        const questState = new SqliteQuestRepository(database).getPlayerState(player.id);
        assert.equal(questState?.stamina, MAX_STAMINA);
        assert.equal(questState?.staminaHealTime.toISOString(), FULL_STAMINA_HEAL_TIME.toISOString());
    } finally {
        database.close();
    }
});

test("quest repository cannot persist depleted stamina", () => {
    const database = createDatabase(":memory:");
    try {
        const players = new SqlitePlayerRepository(database);
        const player = players.createInitial(
            createAccount(database),
            new PlayerFactory(new FixedClock(new Date("2026-09-07T00:00:00Z"))).createInitialState(),
        );
        const quests = new SqliteQuestRepository(database);
        quests.updateStamina(player.id, 0);
        const raw = database.prepare("SELECT stamina FROM players WHERE id = ?").get(player.id) as { stamina: number };
        assert.equal(raw.stamina, MAX_STAMINA);
    } finally {
        database.close();
    }
});
