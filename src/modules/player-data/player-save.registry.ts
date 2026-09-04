export interface PortableTableSpec {
    /** Stable save-format key. Do not rename without a save-format migration. */
    key: string;
    table: string;
    /** Database-only columns omitted from the portable representation. */
    omit?: readonly string[];
}

/**
 * FK-safe import order. Deletion is performed in reverse order.
 *
 * accounts, sessions and global raid_event_state are intentionally absent:
 * a player save contains game state, never authentication or shared server state.
 * player_payment_grants is audit/payment history, not authoritative game state;
 * the paid-bead balance itself lives in players.vmoney and is portable.
 */
export const PORTABLE_PLAYER_TABLES: readonly PortableTableSpec[] = [
    { key: "options", table: "players_options" },
    { key: "triggeredTutorials", table: "players_triggered_tutorials" },
    { key: "clearedRegularMissions", table: "players_cleared_regular_missions" },
    { key: "items", table: "players_items" },
    { key: "dailyChallengeEntries", table: "daily_challenge_point_list_entries" },
    { key: "dailyChallengeCampaigns", table: "daily_challenge_point_list_campaigns" },
    { key: "characters", table: "players_characters" },
    { key: "characterBondTokens", table: "players_characters_bond_tokens" },
    { key: "characterManaNodes", table: "players_characters_mana_nodes" },
    { key: "partyGroups", table: "players_party_groups" },
    { key: "parties", table: "players_parties" },
    { key: "equipment", table: "players_equipment" },
    { key: "questProgress", table: "players_quest_progress" },
    { key: "gachaInfo", table: "players_gacha_info" },
    { key: "gachaCampaigns", table: "players_gacha_campaigns" },
    { key: "drawnQuests", table: "players_drawn_quests" },
    { key: "periodicRewardPoints", table: "players_periodic_reward_points" },
    { key: "activeMissionsLegacy", table: "players_active_missions" },
    { key: "activeMissionStagesLegacy", table: "players_active_missions_stages" },
    { key: "boxGacha", table: "players_box_gacha" },
    { key: "startDashExchangeCampaigns", table: "players_start_dash_exchange_campaigns" },
    { key: "multiSpecialExchangeCampaigns", table: "players_multi_special_exchange_campaigns" },
    { key: "activeQuest", table: "player_active_quests" },
    { key: "shopPurchases", table: "player_shop_purchases" },
    { key: "missions", table: "live_mission_progress" },
    { key: "mail", table: "player_mail", omit: ["id"] },
    { key: "eventState", table: "player_event_state" },
    { key: "boxGachaDrawnRewards", table: "players_box_gacha_drawn_rewards" },
    { key: "lifecycle", table: "player_lifecycle_state" },
    { key: "rushEvents", table: "players_rush_events" },
    { key: "rushClearedFolders", table: "players_rush_events_cleared_folders" },
    { key: "rushPlayedParties", table: "players_rush_events_played_parties" },
    { key: "rankingEventRewards", table: "player_ranking_event_rewards" },
] as const;

export const PORTABLE_SECTION_KEYS = new Set(PORTABLE_PLAYER_TABLES.map((entry) => entry.key));
