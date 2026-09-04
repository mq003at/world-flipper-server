import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { JsonCharacterCatalog } from "../../src/content/master-data/json-character-catalog";
import type { Clock } from "../../src/infrastructure/clock/clock";
import { createDatabase } from "../../src/infrastructure/database/database";
import { PlayerFactory } from "../../src/modules/player/player.factory";
import { SqlitePlayerRepository } from "../../src/modules/player/player.repository.sqlite";
import { RewardType } from "../../src/modules/reward/reward.models";
import { SqliteRewardRepository } from "../../src/modules/reward/reward.repository.sqlite";
import { RewardService } from "../../src/modules/reward/reward.service";

class FixedClock implements Clock {
    constructor(private readonly value: Date) {}
    now(): Date {
        return new Date(this.value);
    }
}

function createPlayer(clock: Clock) {
    const database = createDatabase(":memory:");
    const now = clock.now().toISOString();
    const account = database
        .prepare(`
            INSERT INTO accounts (
                app_id, first_login_time, idp_alias, idp_code, idp_id,
                reg_time, last_login_time, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run("561429", now, "alias", "zd3", "reward-test", now, now, "NORMAL");

    const playerRepository = new SqlitePlayerRepository(database);
    const player = playerRepository.createInitial(
        Number(account.lastInsertRowid),
        new PlayerFactory(clock).createInitialState(),
    );

    const characterCatalog = new JsonCharacterCatalog(
        path.resolve(process.cwd(), "content/master"),
    );
    const rewardRepository = new SqliteRewardRepository(database);
    const rewardService = new RewardService(rewardRepository, characterCatalog, clock);

    return { database, player, rewardRepository, rewardService };
}

test("reward service grants core reward types and persists final state", () => {
    const clock = new FixedClock(new Date("2026-09-04T12:00:00.000Z"));
    const { database, player, rewardRepository, rewardService } = createPlayer(clock);

    try {
        const result = rewardService.grant(player.id, [
            { type: RewardType.ITEM, id: 3, count: 5 },
            { type: RewardType.EQUIPMENT, id: 50001, count: 2 },
            { type: RewardType.CHARACTER, id: 111001 },
            { type: RewardType.BEADS, count: 30 },
            { type: RewardType.MANA, count: 200 },
            { type: RewardType.EXP, count: 400 },
        ]);

        assert.deepEqual(result.deltas, {
            freeVmoney: 30,
            freeMana: 200,
            expPool: 400,
        });
        assert.deepEqual(result.walletAfter, {
            freeVmoney: 180,
            freeMana: 1200,
            expPool: 400,
        });
        assert.equal(result.items["3"], 5);

        const equipment = rewardRepository.getEquipment(player.id, 50001);
        assert.ok(equipment);
        assert.equal(equipment.level, 1);
        assert.equal(equipment.enhancementLevel, 0);
        assert.equal(equipment.stack, 1);

        const character = rewardRepository.getCharacter(player.id, 111001);
        assert.ok(character);
        assert.equal(character.stack, 0);
        assert.equal(character.bondTokenList.length, 2);
    } finally {
        database.close();
    }
});

test("duplicate character increments stack and grants element/rarity dupe item", () => {
    const clock = new FixedClock(new Date("2026-09-04T12:00:00.000Z"));
    const { database, player, rewardRepository, rewardService } = createPlayer(clock);

    try {
        rewardService.grantOne(player.id, { type: RewardType.CHARACTER, id: 111001 });
        const duplicate = rewardService.grantOne(player.id, {
            type: RewardType.CHARACTER,
            id: 111001,
        });

        assert.equal(duplicate.characters.length, 1);
        assert.equal(duplicate.characters[0]?.isNew, false);
        assert.deepEqual(duplicate.characters[0]?.duplicateItem, {
            id: 14003,
            count: 1,
            total: 1,
        });
        assert.equal(duplicate.items["14003"], 1);
        assert.equal(rewardRepository.getItemAmount(player.id, 14003), 1);
        assert.equal(rewardRepository.getCharacter(player.id, 111001)?.stack, 1);

        const secondDuplicate = rewardService.grantOne(player.id, {
            type: RewardType.CHARACTER,
            id: 111001,
        });
        assert.equal(secondDuplicate.items["14003"], 2);
        assert.equal(rewardRepository.getCharacter(player.id, 111001)?.stack, 2);
    } finally {
        database.close();
    }
});

test("reward batch rolls back atomically when master data is invalid", () => {
    const clock = new FixedClock(new Date("2026-09-04T12:00:00.000Z"));
    const { database, player, rewardRepository, rewardService } = createPlayer(clock);

    try {
        assert.throws(
            () =>
                rewardService.grant(player.id, [
                    { type: RewardType.ITEM, id: 3, count: 5 },
                    { type: RewardType.CHARACTER, id: 999_999_999 },
                ]),
            /does not exist in master data/,
        );

        assert.equal(rewardRepository.getItemAmount(player.id, 3), null);
        assert.deepEqual(rewardRepository.getWallet(player.id), {
            freeVmoney: 150,
            freeMana: 1000,
            expPool: 0,
        });
    } finally {
        database.close();
    }
});
