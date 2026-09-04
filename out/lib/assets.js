"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRushEventFolderClearRewards = exports.getShopItemSync = exports.getBossCoinShopItemsSync = exports.getEventShopItemsSync = exports.getGenericShopItemsSync = exports.getGachaCampaignIdSync = exports.getGachaSync = exports.getBoxGachaSync = exports.getExBoostItemSync = exports.getExStatusPoolSync = exports.getExAbilityPoolsSync = exports.getCharacterManaNodeSync = exports.getCharacterManaNodesSync = exports.getCharacterDataSync = exports.getQuestFromCategorySync = exports.getAdventEventQuest = exports.getWorldStoryEventBossBattleQuestSync = exports.getWorldStoryEventQuestSync = exports.getCharacterQuestSync = exports.getBossBattleQuestSync = exports.getExQuestSync = exports.getMainQuestSync = exports.getScoreRewardGroup = exports.getRareScoreRewardGroup = exports.getClearRewardSync = void 0;
const advent_event_quest_json_1 = __importDefault(require("../../assets/advent_event_quest.json"));
const boss_battle_quest_json_1 = __importDefault(require("../../assets/boss_battle_quest.json"));
const box_gacha_json_1 = __importDefault(require("../../assets/box_gacha.json"));
const box_reward_json_1 = __importDefault(require("../../assets/box_reward.json"));
const character_json_1 = __importDefault(require("../../assets/character.json"));
const character_quest_json_1 = __importDefault(require("../../assets/character_quest.json"));
const clear_reward_json_1 = __importDefault(require("../../assets/clear_reward.json"));
const daily_exp_mana_event_quest_json_1 = __importDefault(require("../../assets/daily_exp_mana_event_quest.json"));
const daily_week_event_quest_json_1 = __importDefault(require("../../assets/daily_week_event_quest.json"));
const world_story_event_boss_battle_quest_json_1 = __importDefault(require("../../assets/world_story_event_boss_battle_quest.json"));
const world_story_event_quest_json_1 = __importDefault(require("../../assets/world_story_event_quest.json"));
const carnival_event_quest_json_1 = __importDefault(require("../../assets/carnival_event_quest.json"));
const challenge_dungeon_event_quest_json_1 = __importDefault(require("../../assets/challenge_dungeon_event_quest.json"));
const expert_single_event_quest_json_1 = __importDefault(require("../../assets/expert_single_event_quest.json"));
const raid_event_quest_json_1 = __importDefault(require("../../assets/raid_event_quest.json"));
const ranking_event_single_quest_json_1 = __importDefault(require("../../assets/ranking_event_single_quest.json"));
const rush_event_quest_json_1 = __importDefault(require("../../assets/rush_event_quest.json"));
const score_attack_event_quest_json_1 = __importDefault(require("../../assets/score_attack_event_quest.json"));
const solo_time_attack_event_quest_json_1 = __importDefault(require("../../assets/solo_time_attack_event_quest.json"));
const story_event_single_quest_json_1 = __importDefault(require("../../assets/story_event_single_quest.json"));
const tower_dungeon_event_quest_json_1 = __importDefault(require("../../assets/tower_dungeon_event_quest.json"));
const ex_ability_json_1 = __importDefault(require("../../assets/ex_ability.json"));
const ex_boost_json_1 = __importDefault(require("../../assets/ex_boost.json"));
const ex_quest_json_1 = __importDefault(require("../../assets/ex_quest.json"));
const ex_status_json_1 = __importDefault(require("../../assets/ex_status.json"));
const gacha_json_1 = __importDefault(require("../../assets/gacha.json"));
const main_quest_json_1 = __importDefault(require("../../assets/main_quest.json"));
const mana_node_json_1 = __importDefault(require("../../assets/mana_node.json"));
const rare_score_reward_json_1 = __importDefault(require("../../assets/rare_score_reward.json"));
const score_reward_json_1 = __importDefault(require("../../assets/score_reward.json"));
const gacha_campaign_json_1 = __importDefault(require("../../assets/gacha_campaign.json"));
const boss_coin_shop_json_1 = __importDefault(require("../../assets/boss_coin_shop.json"));
const boss_coin_shop_item_category_map_json_1 = __importDefault(require("../../assets/boss_coin_shop_item_category_map.json"));
const event_item_shop_json_1 = __importDefault(require("../../assets/event_item_shop.json"));
const event_item_shop_id_map_json_1 = __importDefault(require("../../assets/event_item_shop_id_map.json"));
const general_shop_json_1 = __importDefault(require("../../assets/general_shop.json"));
const star_grain_shop_json_1 = __importDefault(require("../../assets/star_grain_shop.json"));
const treasure_shop_json_1 = __importDefault(require("../../assets/treasure_shop.json"));
const rush_event_quest_folder_json_1 = __importDefault(require("../../assets/rush_event_quest_folder.json"));
const types_1 = require("./types");
/**
 * Gets a clear reward from its ID.
 *
 * @param clearRewardId The ID of the clear reward.
 * @returns The clear reward that was found, or null.
 */
function getClearRewardSync(clearRewardId) {
    const clearReward = clear_reward_json_1.default[String(clearRewardId)];
    return clearReward ? clearReward : null;
}
exports.getClearRewardSync = getClearRewardSync;
/**
 * Gets a rare score reward group from its ID.
 *
 * @param groupId The ID of the rare score reward group.
 * @returns The score reward group that was found, or null.
 */
function getRareScoreRewardGroup(groupId) {
    const group = rare_score_reward_json_1.default[String(groupId)];
    return group ? group : null;
}
exports.getRareScoreRewardGroup = getRareScoreRewardGroup;
/**
 * Gets a score reward group from its ID.
 *
 * @param groupId The ID of the group.
 * @returns The score reward group that was found, or null.
 */
function getScoreRewardGroup(groupId) {
    const group = score_reward_json_1.default[String(groupId)];
    return group ? group : null;
}
exports.getScoreRewardGroup = getScoreRewardGroup;
/**
 * Generic quest fetching function.
 *
 * @param quests The list of quests to search.
 * @param questId The ID of the quest to get.
 * @returns The found BattleQuest, StoryQuest, or null
 */
function getQuestSync(quests, questId) {
    const quest = quests[String(questId)];
    // return null if the quest doesn't exist
    if (!quest)
        return null;
    // return either a story quest or a battle quest depending on the keys present
    return 'manaReward' in quest ? {
        name: quest.name,
        clearReward: quest.clearRewardId === undefined ? undefined : getClearRewardSync(quest.clearRewardId),
        sPlusReward: quest.sPlusRewardId === undefined ? undefined : getClearRewardSync(quest.sPlusRewardId),
        scoreRewardGroupId: quest.scoreRewardGroup,
        scoreRewardGroup: quest.scoreRewardGroup === undefined ? undefined : getScoreRewardGroup(quest.scoreRewardGroup),
        bRankTime: quest.bRankTime,
        aRankTime: quest.aRankTime,
        sRankTime: quest.sRankTime,
        sPlusRankTime: quest.sPlusRankTime,
        rankPointReward: quest.rankPointReward,
        characterExpReward: quest.characterExpReward,
        manaReward: quest.manaReward,
        poolExpReward: quest.poolExpReward,
        fixedParty: quest.fixedParty,
        rushEventId: quest.rushEventId,
        rushEventFolderId: quest.rushEventFolderId,
        rushEventRound: quest.rushEventRound
    } : {
        name: quest.name,
        clearReward: quest.clearRewardId === undefined ? undefined : getClearRewardSync(quest.clearRewardId),
    };
}
/**
 * Gets the data for a main quest from the database.
 *
 * @param questId The ID of the quest.
 * @returns A BattleQuest, StoryQuest, or null
 */
function getMainQuestSync(questId) {
    return getQuestSync(main_quest_json_1.default, questId);
}
exports.getMainQuestSync = getMainQuestSync;
/**
 * Gets an EX quest.
 *
 * @param questId The ID of the quest to get.
 * @returns The found BattleQuest or null
 */
function getExQuestSync(questId) {
    return getQuestSync(ex_quest_json_1.default, questId);
}
exports.getExQuestSync = getExQuestSync;
/**
 * Gets a boss battle quest.
 *
 * @param questId The ID of the quest to get.
 * @returns The found BattleQuest or null
 */
function getBossBattleQuestSync(questId) {
    return getQuestSync(boss_battle_quest_json_1.default, questId);
}
exports.getBossBattleQuestSync = getBossBattleQuestSync;
/**
 * Gets a character quest.
 *
 * @param questId The ID of the quest to get.
 * @returns The found StoryQuest or null
 */
function getCharacterQuestSync(questId) {
    return getQuestSync(character_quest_json_1.default, questId);
}
exports.getCharacterQuestSync = getCharacterQuestSync;
/**
 * Gets a world story event quest.
 *
 * @param questId The ID of the quest to get.
 * @returns The found StoryQuest or null
 */
function getWorldStoryEventQuestSync(questId) {
    return getQuestSync(world_story_event_quest_json_1.default, questId);
}
exports.getWorldStoryEventQuestSync = getWorldStoryEventQuestSync;
/**
 * Gets a world story event boss battle quest.
 *
 * @param questId The ID of the quest to get.
 * @returns The found StoryQuest or null
 */
function getWorldStoryEventBossBattleQuestSync(questId) {
    return getQuestSync(world_story_event_boss_battle_quest_json_1.default, questId);
}
exports.getWorldStoryEventBossBattleQuestSync = getWorldStoryEventBossBattleQuestSync;
/**
 * Gets an advent quest.
 *
 * @param questId The ID of the quest to get.
 * @returns The found StoryQuest or null
 */
function getAdventEventQuest(questId) {
    return getQuestSync(advent_event_quest_json_1.default, questId);
}
exports.getAdventEventQuest = getAdventEventQuest;
/**
 * Gets a quest from a specific quest category.
 *
 * @param category The category of the quest.
 * @param questId The ID of the quest.
 * @returns The BattleQuest or StoryQuest that was found, or null if nothing was found.
 */
function getQuestFromCategorySync(category, questId) {
    switch (category) {
        case types_1.QuestCategory.MAIN:
            return getMainQuestSync(questId);
        case types_1.QuestCategory.EX:
            return getExQuestSync(questId);
        case types_1.QuestCategory.BOSS_BATTLE:
            return getBossBattleQuestSync(questId);
        case types_1.QuestCategory.CHARACTER:
            return getCharacterQuestSync(questId);
        case types_1.QuestCategory.WORLD_STORY_EVENT:
            return getWorldStoryEventQuestSync(questId);
        case types_1.QuestCategory.WORLD_STORY_EVENT_BOSS_BATTLE:
            return getWorldStoryEventBossBattleQuestSync(questId);
        case types_1.QuestCategory.ADVENT_EVENT_SINGLE:
        case types_1.QuestCategory.ADVENT_EVENT_MULTI:
            return getAdventEventQuest(questId);
        case types_1.QuestCategory.STORY_EVENT_SINGLE:
            return getQuestSync(story_event_single_quest_json_1.default, questId);
        case types_1.QuestCategory.RANKING_EVENT_SINGLE:
            return getQuestSync(ranking_event_single_quest_json_1.default, questId);
        case types_1.QuestCategory.CHALLENGE_DUNGEON_EVENT:
            return getQuestSync(challenge_dungeon_event_quest_json_1.default, questId);
        case types_1.QuestCategory.DAILY_EXP_MANA_EVENT:
            return getQuestSync(daily_exp_mana_event_quest_json_1.default, questId);
        case types_1.QuestCategory.DAILY_WEEK_EVENT:
            return getQuestSync(daily_week_event_quest_json_1.default, questId);
        case types_1.QuestCategory.TOWER_DUNGEON_EVENT:
            return getQuestSync(tower_dungeon_event_quest_json_1.default, questId);
        case types_1.QuestCategory.EXPERT_SINGLE_EVENT:
            return getQuestSync(expert_single_event_quest_json_1.default, questId);
        case types_1.QuestCategory.CARNIVAL_EVENT:
            return getQuestSync(carnival_event_quest_json_1.default, questId);
        case types_1.QuestCategory.RAID_EVENT:
            return getQuestSync(raid_event_quest_json_1.default, questId);
        case types_1.QuestCategory.RUSH_EVENT:
            return getQuestSync(rush_event_quest_json_1.default, questId);
        case types_1.QuestCategory.SOLO_TIME_ATTACK_EVENT:
            return getQuestSync(solo_time_attack_event_quest_json_1.default, questId);
        case types_1.QuestCategory.SCORE_ATTACK_EVENT:
            return getQuestSync(score_attack_event_quest_json_1.default, questId);
        default:
            return null;
    }
}
exports.getQuestFromCategorySync = getQuestFromCategorySync;
/**
 * Gets a character's asset data from their id.
 *
 * @param characterId The ID of the character.
 * @returns The character's asset data, or null if it wasn't found.
 */
function getCharacterDataSync(characterId) {
    const character = character_json_1.default[String(characterId)];
    if (!character)
        return null;
    return character;
}
exports.getCharacterDataSync = getCharacterDataSync;
/**
 * Gets all of a character's mana nodes of a certain level.
 *
 * @param characterId The ID of the character.
 * @param level The mana node level to get the nodes of.
 * @returns A record containing ManaNode objects or null.
 */
function getCharacterManaNodesSync(characterId, level) {
    const characterManaNodes = mana_node_json_1.default[String(characterId)];
    if (!characterManaNodes)
        return null;
    return characterManaNodes[String(level)] || null;
}
exports.getCharacterManaNodesSync = getCharacterManaNodesSync;
/**
 * Gets the data for a character mana node.
 *
 * @param characterId The ID of the character.
 * @param level The mana node level to get the node from.
 * @param manaNodeId The ID of the mana node.
 * @returns A ManaNode object or null.
 */
function getCharacterManaNodeSync(characterId, level, manaNodeId) {
    const nodes = getCharacterManaNodesSync(characterId, level);
    if (!nodes)
        return null;
    return nodes[String(manaNodeId)] || null;
}
exports.getCharacterManaNodeSync = getCharacterManaNodeSync;
/**
 * Gets the ExAbilities record.
 *
 * @returns
 */
function getExAbilityPoolsSync() {
    return ex_ability_json_1.default;
}
exports.getExAbilityPoolsSync = getExAbilityPoolsSync;
/**
 * Gets an ex status pool.
 *
 * @param tier The tier of the pool to get.
 * @returns A list of numbers with the StatusIDs corresponding to the requested pool.
 */
function getExStatusPoolSync(tier) {
    const pool = ex_status_json_1.default[String(tier)];
    return pool === undefined ? null : pool;
}
exports.getExStatusPoolSync = getExStatusPoolSync;
/**
 * Gets an ex boost item.
 *
 * @param itemId The ID of the item.
 * @returns The ExBoostItem that was found, or null.
 */
function getExBoostItemSync(itemId) {
    const item = ex_boost_json_1.default[String(itemId)];
    return item === undefined ? null : item;
}
exports.getExBoostItemSync = getExBoostItemSync;
/**
 * Gets the data for a box gacha from the assets folder.
 *
 * @param id The ID of the box gacha.
 * @returns A BoxGacha object or null, if it didn't exist.
 */
function getBoxGachaSync(id) {
    const idString = String(id);
    // get redeem item data
    const redeemItemData = box_gacha_json_1.default[idString];
    if (redeemItemData === undefined)
        return null;
    // get boxes
    const boxes = box_reward_json_1.default[idString];
    if (boxes === undefined)
        return null;
    // build box gacha
    return {
        redeemItemId: redeemItemData.itemId,
        redeemItemCount: redeemItemData.count,
        boxes: boxes,
        availableCounts: redeemItemData.availableCounts
    };
}
exports.getBoxGachaSync = getBoxGachaSync;
/**
 * Gets the data for a gacha.
 *
 * @param id The ID of the gacha.
 * @returns The gacha's data, or null.
 */
function getGachaSync(id) {
    const data = gacha_json_1.default[String(id)];
    return data !== null && data !== void 0 ? data : null;
}
exports.getGachaSync = getGachaSync;
/**
 * Gets the ID of the gacha campaign assigned to a gacha.
 *
 * @param gachaId The ID of the gacha.
 * @returns The ID of the assigned gacha campaign or null.
 */
function getGachaCampaignIdSync(gachaId) {
    var _a;
    return (_a = gacha_campaign_json_1.default[String(gachaId)]) !== null && _a !== void 0 ? _a : null;
}
exports.getGachaCampaignIdSync = getGachaCampaignIdSync;
// shop functions
/**
 * Gets the items for a generic shop.
 *
 * @param shopType The type of shop to get the items of.
 * @returns A list of shop items belonging to the specified shop type or null.
 */
function getGenericShopItemsSync(shopType) {
    switch (shopType) {
        case types_1.ShopType.TREASURE:
            return treasure_shop_json_1.default;
        case types_1.ShopType.GENERAL:
            return general_shop_json_1.default;
        case types_1.ShopType.STAR_GRAIN:
            return star_grain_shop_json_1.default;
    }
    return null;
}
exports.getGenericShopItemsSync = getGenericShopItemsSync;
/**
 * Gets the items for a specific event shop.
 *
 * @param eventType The type of event.
 * @param eventId The ID of the event.
 * @returns A list of shop items or null.
 */
function getEventShopItemsSync(eventType, eventId) {
    var _a;
    const typeSection = event_item_shop_json_1.default[String(eventType)];
    if (typeSection === undefined)
        return null;
    return (_a = typeSection[String(eventId)]) !== null && _a !== void 0 ? _a : null;
}
exports.getEventShopItemsSync = getEventShopItemsSync;
/**
 * Gets the items belonging to a specific boss coin shop.
 *
 * @param bossId The ID of the boss to get the items of.
 * @returns A list of shop items or null.
 */
function getBossCoinShopItemsSync(bossId) {
    var _a;
    return (_a = boss_coin_shop_json_1.default[String(bossId)]) !== null && _a !== void 0 ? _a : null;
}
exports.getBossCoinShopItemsSync = getBossCoinShopItemsSync;
/**
 * Gets the data for a specfic ShopItem.
 *
 * @param shopType The type of shop that this item belongs to.
 * @param itemId The ID of this item.
 * @returns The ShopItem data or null.
 */
function getShopItemSync(shopType, itemId) {
    var _a, _b, _c, _d, _e;
    switch (shopType) {
        case types_1.ShopType.TREASURE:
            return (_a = treasure_shop_json_1.default[String(itemId)]) !== null && _a !== void 0 ? _a : null;
        case types_1.ShopType.GENERAL:
            return (_b = general_shop_json_1.default[String(itemId)]) !== null && _b !== void 0 ? _b : null;
        case types_1.ShopType.STAR_GRAIN:
            return (_c = star_grain_shop_json_1.default[String(itemId)]) !== null && _c !== void 0 ? _c : null;
        case types_1.ShopType.BOSS_COIN:
            const category = boss_coin_shop_item_category_map_json_1.default[itemId];
            if (category === undefined)
                return null;
            return (_d = boss_coin_shop_json_1.default[category][itemId]) !== null && _d !== void 0 ? _d : null;
        case types_1.ShopType.EVENT_ITEM:
            const mapInfo = event_item_shop_id_map_json_1.default[itemId];
            if (mapInfo === undefined)
                return null;
            return (_e = event_item_shop_json_1.default[mapInfo.eventType][mapInfo.eventId][itemId]) !== null && _e !== void 0 ? _e : null;
        default:
            return null;
    }
}
exports.getShopItemSync = getShopItemSync;
/**
 * Gets the rewards that should be given when clearing a given folder.
 *
 * @param rushEventId The ID of the rush event.
 * @param folderId The ID of the folder.
 * @returns
 */
function getRushEventFolderClearRewards(rushEventId, folderId) {
    var _a;
    const folders = rush_event_quest_folder_json_1.default[rushEventId];
    if (folders === undefined)
        return null;
    return (_a = folders[folderId]) !== null && _a !== void 0 ? _a : null;
}
exports.getRushEventFolderClearRewards = getRushEventFolderClearRewards;
