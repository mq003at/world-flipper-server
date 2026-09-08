import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { JsonCharacterCatalog } from "../src/content/master-data/json-character-catalog";
import { ShopItemRewardType } from "../src/content/master-data/shop-catalog";
import { createDatabase } from "../src/infrastructure/database/database";
import { FixedClock } from "../src/infrastructure/clock/fixed-clock";
import { loadGachaRotationConfig } from "../src/modules/gacha/gacha-rotation.config";
import { SeasonalGachaCalendar } from "../src/modules/gacha/seasonal-gacha-calendar";
import { StarSliverShopCatalog } from "../src/modules/shop/star-sliver-shop.catalog";
import { loadStarSliverShopConfig } from "../src/modules/shop/star-sliver-shop.config";
import { SqliteShopRepository } from "../src/modules/shop/shop.repository.sqlite";
import { ShopService } from "../src/modules/shop/shop.service";
import { ShopType } from "../src/content/master-data/shop-catalog";

test("Star Sliver catalog includes only released eligible 4/5-star characters and Astral Gems", () => {
    const database = createDatabase(":memory:");
    try {
        const now = new Date("2026-09-07T00:00:00.000Z");
        const liveDir = path.resolve("content/live");
        const calendar = new SeasonalGachaCalendar(loadGachaRotationConfig(liveDir));
        const season = calendar.position(now).seasonNumber;
        const insert = database.prepare(`INSERT INTO season_unit_release
            (season_number, content_type, unit_id, released_at, source_banner_type, source_banner_run_id)
            VALUES (?, 'character', ?, ?, ?, ?)`);
        insert.run(season, 111007, "2026-01-01T00:00:00.000Z", "base", "base");
        insert.run(season, 211009, "2026-01-01T00:00:00.000Z", "new", "new");
        insert.run(season, 111004, "2026-01-01T00:00:00.000Z", "seasonal", "excluded");
        insert.run(season, 700015, "2026-01-01T00:00:00.000Z", "anniversary", "explicit");
        insert.run(season, 161007, "2099-01-01T00:00:00.000Z", "new", "unreleased");

        const config = loadStarSliverShopConfig(liveDir);
        const catalog = new StarSliverShopCatalog(
            database,
            new JsonCharacterCatalog(path.resolve("content/master")),
            calendar,
            config,
        );
        const items = catalog.list(now);
        const characterIds = items.flatMap((item) => item.rewards
            .filter((reward) => reward.type === ShopItemRewardType.CHARACTER)
            .map((reward) => reward.id));
        assert.deepEqual(characterIds, [111007, 211009, 700015]);
        assert.deepEqual(items.flatMap((item) => item.rewards
            .filter((reward) => reward.type === ShopItemRewardType.ITEM)
            .map((reward) => reward.id)).sort(), [10002, 10003]);
        assert.equal(items.find((item) => item.rewards[0]?.id === 111007)?.costs[0]?.amount, 600);
        assert.equal(items.find((item) => item.rewards[0]?.id === 211009)?.costs[0]?.amount, 300);
    } finally {
        database.close();
    }
});

test("Star Sliver purchase deducts players.star_crumb rather than players_items 990008", () => {
    const database = createDatabase(":memory:");
    try {
        const now = new Date("2026-09-07T00:00:00.000Z");
        database.exec(`
            INSERT INTO accounts (id, app_id, first_login_time, idp_alias, idp_code, idp_id, reg_time, last_login_time, status)
            VALUES (1, '561432', '${now.toISOString()}', 'test', 'test', 'star-sliver', '${now.toISOString()}', '${now.toISOString()}', 'active');
            INSERT INTO players (id, stamina, stamina_heal_time, boost_point, boss_boost_point, transition_state, role,
                name, last_login_time, comment, vmoney, free_vmoney, rank_point, star_crumb, bond_token, exp_pool,
                exp_pooled_time, leader_character_id, party_slot, degree_id, birth, free_mana, paid_mana,
                enable_auto_3x, account_id, tutorial_step, tutorial_skip_flag)
            VALUES (3, 120, '${now.toISOString()}', 3, 3, 0, 1, 'Test', '${now.toISOString()}', '', 0, 0, 10,
                2100, 0, 0, '${now.toISOString()}', 1, 1, 1, 19900101, 0, 0, 0, 1, 0, NULL);
        `);
        const liveDir = path.resolve("content/live");
        const calendar = new SeasonalGachaCalendar(loadGachaRotationConfig(liveDir));
        const season = calendar.position(now).seasonNumber;
        database.prepare(`INSERT INTO season_unit_release
            (season_number, content_type, unit_id, released_at, source_banner_type, source_banner_run_id)
            VALUES (?, 'character', 111007, ?, 'base', 'base')`).run(season, now.toISOString());
        const config = loadStarSliverShopConfig(liveDir);
        const dynamicCatalog = new StarSliverShopCatalog(database, new JsonCharacterCatalog(path.resolve("content/master")), calendar, config);
        let grantedCharacter = 0;
        const service = new ShopService(
            { requireViewerSession: () => ({ accountId: 1 }) } as any,
            { requireForAccount: () => ({ id: 3 }) } as any,
            new SqliteShopRepository(database),
            { findItem: () => null, getGenericItems: () => [], getBossCoinItems: () => [], getEventItems: () => [], findEventReferenceForItem: () => null },
            { grant: (_playerId: number, rewards: Array<{ id?: number }>) => {
                grantedCharacter = rewards[0]?.id ?? 0;
                return { walletBefore: {}, walletAfter: {}, deltas: {}, characters: [], equipment: [], items: {} };
            } } as any,
            new FixedClock(now),
            undefined,
            undefined,
            undefined,
            dynamicCatalog,
            config.currencyItemId,
        );
        const result = service.buy({ viewerId: 123, shopType: ShopType.STAR_SLIVER, shopItemId: 10_111_007, number: 1, apiCount: 0 });
        assert.equal(result.state.starCrumb, 1500);
        assert.equal(result.itemList["990008"], 1500);
        assert.equal(grantedCharacter, 111007);
        assert.equal((database.prepare("SELECT COUNT(*) AS count FROM players_items WHERE player_id = 3 AND id = 990008").get() as { count: number }).count, 0);
    } finally {
        database.close();
    }
});

test("generated client master contains no armaments or legacy Star Sliver items", () => {
    const master = require("../assets/star_grain_shop.json") as Record<string, { rewards: Array<{ type: number; id: number }> }>;
    const rewards = Object.values(master).flatMap((item) => item.rewards);
    assert.ok(rewards.every((reward) => reward.type === ShopItemRewardType.CHARACTER
        || (reward.type === ShopItemRewardType.ITEM && (reward.id === 10002 || reward.id === 10003))));
});
