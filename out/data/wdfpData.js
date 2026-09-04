"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlayerGachaInfoSync = exports.insertPlayerGachaInfoSync = exports.getPlayerGachaInfoSync = exports.getPlayerGachaInfoListSync = exports.updatePlayerQuestProgressSync = exports.insertPlayerQuestProgressSync = exports.getPlayerSingleQuestProgressSync = exports.getPlayerQuestProgressSync = exports.deletePlayerEquipmentSync = exports.updatePlayerEquipmentSync = exports.insertPlayerEquipmentSync = exports.playerOwnsEquipmentSync = exports.getPlayerEquipmentSync = exports.getPlayerEquipmentListSync = exports.givePlayerItemSync = exports.updatePlayerItemSync = exports.getPlayerItemsSync = exports.getPlayerItemSync = exports.updatePlayerPartyGroupSync = exports.updatePlayerPartySync = exports.insertPlayerPartyGroupListSync = exports.getPlayerPartyGroupListSync = exports.insertPlayerCharacterManaNodesSync = exports.hasPlayerUnlockedCharacterManaNodeSync = exports.getPlayerCharacterManaNodesSync = exports.getPlayerCharactersManaNodesSync = exports.updatePlayerCharacterSync = exports.insertDefaultPlayerCharacterSync = exports.insertPlayerCharacterSync = exports.updatePlayerCharacterBondTokenSync = exports.getPlayerCharactersSync = exports.getPlayerCharacterSync = exports.playerOwnsCharacterSync = exports.getPlayerClearedRegularMissionListSync = exports.insertPlayerTriggeredTutorialSync = exports.getPlayerTriggeredTutorialsSync = exports.getPlayerDailyChallengePointListSync = exports.generateViewerIdSession = exports.deleteAccountSessionsOfType = exports.deleteAccountSessions = exports.deleteSession = exports.insertSession = exports.insertSessionWithToken = exports.getAccountSessionsOfType = exports.getSession = exports.updateAccount = exports.insertAccount = exports.getAccountPlayers = exports.getAccount = exports.getAccountFromIdpIdSync = void 0;
exports.insertPlayerSync = exports.getAllPlayersSync = exports.getPlayerSync = exports.getAccountFromPlayerIdSync = exports.getPlayerFromAccountIdSync = exports.updatePlayerOptionsSync = exports.updatePlayerOptionSync = exports.getPlayerOptionsSync = exports.insertPlayerOptionsSync = exports.insertPlayerOptionSync = exports.updatePlayerRushEventPlayedPartySync = exports.deletePlayerRushEventPlayedPartiesUntilSync = exports.deletePlayerRushEventPlayedPartySync = exports.deletePlayerRushEventPlayedPartyListSync = exports.insertPlayerRushEventPlayedPartyListSync = exports.insertPlayerRushEventPlayedPartySync = exports.getPlayerRushEventNextEndlessBattleRoundSync = exports.getPlayerRushEventListPlayedPartiesSync = exports.getPlayerRushEventPlayedPartiesSync = exports.serializePlayerRushEventPlayedParty = exports.deserializePlayerRushEventPlayedParty = exports.insertPlayerRushEventClearedFolderListSync = exports.insertPlayerRushEventClearedFolderSync = exports.getPlayerRushEventListClearedFoldersSync = exports.getPlayerRushEventClearedFoldersSync = exports.updatePlayerRushEventSync = exports.insertPlayerRushEventListSync = exports.insertPlayerRushEventSync = exports.getPlayerIdFromRushEventEndlessRankSync = exports.getRushEventEndlessRankingListSync = exports.getPlayerRushEventListSync = exports.getPlayerRushEventSync = exports.getDefaultPlayerRushEventSync = exports.deserializeRushEvent = exports.getPlayerMultiSpecialExchangeCampaignsSync = exports.getPlayerStartDashExchangeCampaignsSync = exports.updatePlayerBoxGachaDrawnRewardSync = exports.insertPlayerBoxGachaDrawnRewardSync = exports.getPlayerBoxGachaDrawnRewardsSync = exports.updatePlayerBoxGachaSync = exports.insertPlayerBoxGachaSync = exports.getPlayerBoxGachasSync = exports.getPlayerBoxGachaSync = exports.getPlayerActiveMissionsSync = exports.getPlayerPeriodicRewardPointsSync = exports.getPlayerDrawnQuestsSync = exports.updatePlayerGachaCampaignSync = exports.insertPlayerGachaCampaignSync = exports.getPlayerGachaCampaignListSync = exports.getPlayerGachaCampaignSync = void 0;
exports.dailyResetPlayerSync = exports.dailyResetPlayerDataSync = exports.collectPlayerPooledExpSync = exports.collectPlayerDataPooledExpSync = exports.deletePlayerSync = exports.replacePlayerDataSync = exports.updatePlayerSync = exports.insertDefaultPlayerSync = exports.getDefaultPlayerPartyGroupsSync = exports.insertMergedPlayerDataSync = void 0;
const crypto_1 = require("crypto");
const _1 = __importDefault(require("."));
const utils_1 = require("../utils");
const types_1 = require("./types");
const utils_2 = require("./utils");
const rush_1 = require("../lib/rush");
const db = (0, _1.default)(0 /* Database.WDFP_DATA */);
const expPoolMax = 100000; // the maximum amount of exp that can be pooled
// Account
/**
 * Converts a RawAccount into a Account
 *
 * @param rawAccount The RawAccount to convert.
 * @returns The converted Account
 */
function buildAccount(rawAccount) {
    return {
        id: rawAccount.id,
        appId: rawAccount.app_id,
        firstLoginTime: new Date(rawAccount.first_login_time),
        idpAlias: rawAccount.idp_alias,
        idpCode: rawAccount.idp_code,
        idpId: rawAccount.idp_id,
        regTime: new Date(rawAccount.reg_time),
        lastLoginTime: new Date(rawAccount.last_login_time),
        status: rawAccount.status
    };
}
/**
 * Asynchronously gets an Account from their id.
 *
 * @param accountId The ID of the Account to get.
 * @returns The Account that was found or null.
 */
function getAccountSync(accountId) {
    const raw = db.prepare(`
    SELECT id, app_id, first_login_time, idp_alias, idp_code, idp_id, reg_time, last_login_time, status
    FROM accounts
    WHERE id = ?
    `).get(accountId);
    if (raw === undefined)
        return null;
    return buildAccount(raw);
}
/**
 * Gets an account from their IdpId.
 *
 * @param idpId The IdpId of the account.
 * @returns An account or null.
 */
function getAccountFromIdpIdSync(idpId) {
    const raw = db.prepare(`
    SELECT id, app_id, first_login_time, idp_alias, idp_code, idp_id, reg_time, last_login_time, status
    FROM accounts
    WHERE idp_id = ?
    `).get(idpId);
    if (raw === undefined)
        return null;
    return buildAccount(raw);
}
exports.getAccountFromIdpIdSync = getAccountFromIdpIdSync;
/**
 * Gets an Account from their id.
 *
 * @param accountId The ID of the Account to get.
 * @returns A promise that resolves with the Account that was found or null.
 */
function getAccount(accountId) {
    return new Promise((resolve, reject) => {
        try {
            resolve(getAccountSync(accountId));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.getAccount = getAccount;
/**
 * Synchronously gets all of the players that are bound to an account.
 *
 * @param accountId The account's id.
 * @returns A list of player ids.
 */
function getAccountPlayersSync(accountId) {
    const raw = db.prepare(`
    SELECT id
    FROM players
    WHERE account_id = ?
    `).all(accountId);
    return raw.map(player => player.id);
}
/**
 * Gets all of the players that are bound to an account.
 *
 * @param accountId The account's id.
 * @returns A promise that resolves with a list of player ids.
 */
function getAccountPlayers(accountId) {
    return new Promise((resolve, reject) => {
        try {
            resolve(getAccountPlayersSync(accountId));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.getAccountPlayers = getAccountPlayers;
/**
 * Synchronously inserts an Account into the database.
 *
 * @param account An Account object that doesn't include its id, firstLoginTime, lastLoginTime, nor regTime.
 * @returns The Account that was inserted into the database.
 */
function insertAccountSync(account) {
    const dateNow = new Date();
    const dateNowISO = dateNow.toISOString();
    const result = db.prepare(`
    INSERT INTO accounts (app_id, first_login_time, idp_alias, idp_code, idp_id, reg_time, last_login_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(account.appId, dateNowISO, account.idpAlias, account.idpCode, account.idpId, dateNowISO, dateNowISO, account.status);
    const id = result.lastInsertRowid;
    // return the complete player
    const finalAccount = account;
    finalAccount.id = Number(id);
    finalAccount.firstLoginTime = dateNow;
    finalAccount.regTime = dateNow;
    return finalAccount;
}
/**
 * Inserts an Account into the database.
 *
 * @param account An Account object that doesn't include its id, firstLoginTime, nor regTime.
 * @returns A promise that resolves with the Account that was inserted into the database.
 */
function insertAccount(account) {
    return new Promise((resolve, reject) => {
        try {
            resolve(insertAccountSync(account));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.insertAccount = insertAccount;
/**
 * Synchronously updates an Account within the database.
 *
 * @param account The values of the Account to update.
 * @returns The updated Account.
 */
function updateAccountSync(account) {
    const id = account.id;
    const fieldMap = {
        'appId': 'app_id',
        'firstLoginTime': 'first_login_time',
        'idpAlias': 'idp_alias',
        'idpCode': 'idp_code',
        'idpId': 'idp_id',
        'regTime': 'reg_time',
        'lastLoginTime': 'last_login_time',
        'status': 'status'
    };
    const sets = [];
    const values = [];
    for (const key in account) {
        const value = account[key];
        const mapped = fieldMap[key];
        if (mapped && value !== undefined) {
            sets.push(`${mapped} = ?`);
            if (value instanceof Date) {
                values.push(value.toISOString());
            }
            else {
                values.push(value);
            }
        }
    }
    if (sets.length > 0)
        db.prepare(`
        UPDATE accounts
        SET ${sets.join(', ')}
        WHERE id = ?
        `).run([...values, id]);
    return getAccountSync(id);
}
/**
 * Updates an Account within the database.
 *
 * @param account The values of the Account to update.
 * @returns A promise that resolves with the updated Account.
 */
function updateAccount(account) {
    return new Promise((resolve, reject) => {
        try {
            resolve(updateAccountSync(account));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.updateAccount = updateAccount;
// Sessions
/**
 * Converts a RawSession into a Session.
 *
 * @param rawSession The RawSession to convert.
 * @returns The converted Session.
 */
function buildSession(rawSession) {
    return {
        token: rawSession.token,
        accountId: rawSession.account_id,
        expires: new Date(rawSession.expires),
        type: rawSession.type
    };
}
/**
 * Synchronously retrieves a session based on its token.
 *
 * @param token The token of the session to retrieve.
 * @returns The session that was found or null
 */
function getSessionSync(token) {
    const raw = db.prepare(`
    SELECT token, account_id, expires, type
    FROM sessions
    WHERE token = ?
    `).get(token);
    if (raw === undefined)
        return null;
    const session = buildSession(raw);
    // viewer tokens don't expire.
    if (session.type !== types_1.SessionType.VIEWER && new Date() >= session.expires) {
        console.log(`session of type (${session.type}) expired:`, session);
        deleteSessionSync(session.token);
        return null;
    }
    return session;
}
/**
 * Retrieves a session based on its token.
 *
 * @param token The token of the session to retrieve.
 * @returns A promise that resolves with the session that was found or null
 */
function getSession(token) {
    return new Promise((resolve, reject) => {
        try {
            resolve(getSessionSync(token));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.getSession = getSession;
/**
 * Synchronously returns all of the sessions of a particular type belonging to an account.
 *
 * @param accountId The ID of the account to get the sessions of.
 * @param type The type of session to get.
 * @returns An array of sessions.
 */
function getAccountSessionsOfTypeSync(accountId, type) {
    const rawResult = db.prepare(`
    SELECT token, account_id, expires, type
    FROM sessions
    WHERE account_id = ? AND type = ?    
    `).all(accountId, type);
    return rawResult.map(raw => buildSession(raw));
}
/**
 * Returns all of the sessions of a particular type belonging to an account.
 *
 * @param accountId The ID of the account to get the sessions of.
 * @param type The type of session to get.
 * @returns A promise that resolves with an array of sessions.
 */
function getAccountSessionsOfType(accountId, type) {
    return new Promise((resolve, reject) => {
        try {
            resolve(getAccountSessionsOfTypeSync(accountId, type));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.getAccountSessionsOfType = getAccountSessionsOfType;
/**
 * Synchronously inserts a session into the database that already has a token.
 *
 * @param session The session to insert.
 */
function insertSessionWithTokenSync(session) {
    db.prepare(`
    INSERT INTO sessions (token, account_id, expires, type)
    VALUES (?, ?, ?, ?)    
    `).run(session.token, session.accountId, session.expires.toISOString(), session.type);
    return session;
}
/**
 * Synchronously inserts a session into the database that already has a token.
 *
 * @param session The session to insert.
 * @returns A promise that resolves with the session that was inserted.
 */
function insertSessionWithToken(session) {
    return new Promise((resolve, reject) => {
        try {
            resolve(insertSessionWithTokenSync(session));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.insertSessionWithToken = insertSessionWithToken;
/**
 * Synchronously inserts a session into the database.
 *
 * @param session The session to insert into the database without its token.
 * @returns The session that was inserted into the database.
 */
function insertSessionSync(session) {
    const token = (0, crypto_1.randomBytes)(54).toString('base64');
    const completeSession = session;
    completeSession.token = token;
    return insertSessionWithTokenSync(completeSession);
}
/**
 * Inserts a session into the database.
 *
 * @param session The session to insert into the database without its token.
 * @returns A promise that resolves with the session that was inserted into the database.
 */
function insertSession(session) {
    return new Promise((resolve, reject) => {
        try {
            resolve(insertSessionSync(session));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.insertSession = insertSession;
/**
 * Synchronously deletes a session from the database based on its token.
 *
 * @param token The token of the session to delete.
 */
function deleteSessionSync(token) {
    db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}
/**
 * Deletes a session from the database based on its token.
 *
 * @param token The token of the session to delete.
 * @returns A promise that resolves when the session is deleted.
 */
function deleteSession(token) {
    return new Promise((resolve, reject) => {
        try {
            resolve(deleteSessionSync(token));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.deleteSession = deleteSession;
/**
 * Synchronously deletes all of the sessions assigned to a particular player.
 *
 * @param playerId The id of the player to delete all the sessions of.
 */
function deleteAccountSessionsSync(playerId) {
    db.prepare(`DELETE FROM sessions WHERE account_id = ?`).run(playerId);
}
/**
 * Deletes all of the sessions assigned to a particular player.
 *
 * @param playerId The id of the player to delete all the sessions of.
 * @returns A promise that resolves when the sessions have been deleted.
 */
function deleteAccountSessions(playerId) {
    return new Promise((resolve, reject) => {
        try {
            resolve(deleteAccountSessionsSync(playerId));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.deleteAccountSessions = deleteAccountSessions;
/**
 * Synchronously deletes all of an account's sessions of a particular type.
 *
 * @param accountId The ID of the account to delete the sessions of.
 * @param type The type of session to delete.
 */
function deleteAccountSessionsOfTypeSync(accountId, type) {
    db.prepare(`
    DELETE FROM sessions
    WHERE account_id = ? AND type = ?
    `).run(accountId, type);
}
/**
 * Deletes all of an account's sessions of a particular type.
 *
 * @param accountId The ID of the account to delete the sessions of.
 * @param type The type of session to delete.
 * @returns A promise that resolves when the sessions are deleted.
 */
function deleteAccountSessionsOfType(accountId, type) {
    return new Promise((resolve, reject) => {
        try {
            resolve(deleteAccountSessionsOfTypeSync(accountId, type));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.deleteAccountSessionsOfType = deleteAccountSessionsOfType;
function generateViewerIdSession(accountId) {
    return new Promise((resolve, reject) => {
        try {
            // delete any existing viewer ID sessions
            deleteAccountSessionsOfTypeSync(accountId, types_1.SessionType.VIEWER);
            // insert new session
            resolve(insertSessionWithTokenSync({
                token: (0, utils_1.generateViewerId)().toString(),
                expires: new Date(new Date().getTime()),
                accountId: accountId,
                type: types_1.SessionType.VIEWER
            }));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.generateViewerIdSession = generateViewerIdSession;
// player
/**
 * Gets a player's daily challenge point list based on their id.
 *
 * @param playerId The ID of the player to get the daily challenge point list of.
 * @returns The player's daily challenge point list.
 */
function getPlayerDailyChallengePointListSync(playerId) {
    const rawEntries = db.prepare(`
    SELECT id, point
    FROM daily_challenge_point_list_entries
    WHERE player_id = ?
    `).all(playerId);
    const rawCampaigns = db.prepare(`
    SELECT campaign_id, additional_point, list_entry_id
    FROM daily_challenge_point_list_campaigns
    WHERE player_id = ?
    `).all(playerId);
    const campaignBuckets = {};
    for (const rawCampaign of rawCampaigns) {
        const listEntryId = rawCampaign.list_entry_id;
        let bucket = campaignBuckets[listEntryId];
        if (!bucket) {
            bucket = [];
            campaignBuckets[listEntryId] = bucket;
        }
        bucket.push({
            campaignId: rawCampaign.campaign_id,
            additionalPoint: rawCampaign.additional_point
        });
    }
    const entries = [];
    for (const rawEntry of rawEntries) {
        const id = rawEntry.id;
        entries.push({
            id: id,
            point: rawEntry.point,
            campaignList: campaignBuckets[id] || []
        });
    }
    return entries;
}
exports.getPlayerDailyChallengePointListSync = getPlayerDailyChallengePointListSync;
/**
 * Inserts a singular DailyChallengePointListEntry into the database.
 *
 * @param playerId The ID of the player.
 * @param entry The entry to insert.
 */
function insertPlayerDailyChallengePointListEntrySync(playerId, entry) {
    const id = entry.id;
    // insert into the list entry table
    db.prepare(`
    INSERT INTO daily_challenge_point_list_entries (id, point, player_id)
    VALUES (?, ?, ?)
    `).run(id, entry.point, playerId);
    // insert campaigns
    for (const campaign of entry.campaignList) {
        db.prepare(`
        INSERT INTO daily_challenge_point_list_campaigns (campaign_id, additional_point, list_entry_id, player_id)
        VALUES (?, ?, ?, ?)
        `).run(campaign.campaignId, campaign.additionalPoint, id, playerId);
    }
}
/**
 * Batch inserts a list of DailyChallengePointListEntries into the database.
 *
 * @param playerId The ID of the player.
 * @param entries The entries to insert.
 */
function insertPlayerDailyChallengePointListSync(playerId, entries) {
    db.transaction(() => {
        for (const entry of entries) {
            insertPlayerDailyChallengePointListEntrySync(playerId, entry);
        }
    })();
}
/**
 * Gets a player's triggered tutorials.
 *
 * @param playerId The ID of the player to get the triggered tutorials of.
 * @returns A list of the IDs of each triggered tutorial.
 */
function getPlayerTriggeredTutorialsSync(playerId) {
    const raw = db.prepare(`
    SELECT id
    FROM players_triggered_tutorials
    WHERE player_id = ?
    `).all(playerId);
    return raw.map(rawTrigger => rawTrigger.id);
}
exports.getPlayerTriggeredTutorialsSync = getPlayerTriggeredTutorialsSync;
/**
 * Marks a tutorial as having been triggered by a player.
 *
 * @param playerId The ID of the player that triggered the tutorial.
 * @param tutorialId The ID of the tutorial that was triggered.
 */
function insertPlayerTriggeredTutorialSync(playerId, tutorialId) {
    db.prepare(`
    INSERT INTO players_triggered_tutorials (id, player_id)
    VALUES (?, ?)
    `).run(tutorialId, playerId);
}
exports.insertPlayerTriggeredTutorialSync = insertPlayerTriggeredTutorialSync;
/**
 * Batch marks tutorials as having been triggered by a player.
 *
 * @param playerId The ID of the player that triggered the tutorials.
 * @param tutorialIds An array of tutorial IDs which were triggered.
 */
function insertPlayerTriggeredTutorialsSync(playerId, tutorialIds) {
    db.transaction(() => {
        for (const tutorialId of tutorialIds) {
            insertPlayerTriggeredTutorialSync(playerId, tutorialId);
        }
    })();
}
/**
 * Retrieve a list of a player's cleared regular missions.
 *
 * @param playerId The ID of the player.
 * @returns A record, where the index is the id of the mission and the value is ???.
 */
function getPlayerClearedRegularMissionListSync(playerId) {
    const raw = db.prepare(`
    SELECT id, value
    FROM players_cleared_regular_missions
    WHERE player_id = ?
    `).all(playerId);
    const record = {};
    for (const rawClear of raw) {
        record[rawClear.id.toString()] = rawClear.value;
    }
    return record;
}
exports.getPlayerClearedRegularMissionListSync = getPlayerClearedRegularMissionListSync;
/**
 * Sets a regular mission as having been cleared by a player.
 *
 * @param playerId The ID of the player.
 * @param missionId The ID of the mission that was cleared.
 * @param value
 */
function insertPlayerClearedRegularMissionSync(playerId, missionId, value) {
    db.prepare(`
    INSERT INTO players_cleared_regular_missions (id, value, player_id)
    VALUES (?, ?, ?)
    `).run(Number(missionId), value, playerId);
}
/**
 * Sets a list of regular missions as having been cleared by a player.
 *
 * @param playerId The ID of the player.
 * @param missionList The list of missions that were cleared.
 */
function insertPlayerClearedRegularMissionListSync(playerId, missionList) {
    db.transaction(() => {
        for (const [missionId, value] of Object.entries(missionList)) {
            insertPlayerClearedRegularMissionSync(playerId, missionId, value);
        }
    })();
}
/**
 * Converts a RawPlayerCharacterBondToken into a PlayerCharacterBondToken
 *
 * @param rawBondToken The raw bond token to build/deserialize
 * @returns The built/deserialized PlayerCharacterBondToken
 */
function buildCharacterBondToken(rawBondToken) {
    return {
        manaBoardIndex: rawBondToken.mana_board_index,
        status: rawBondToken.status
    };
}
/**
 * Builds a PlayerCharacterExBoost object.
 *
 * @param exBoostStatusId The ex boost's status ID
 * @param exBoostAbilityIdList The serialized string representing the ex boost's ability id list.
 * @returns A PlayerCharacterExBoost object or undefined.
 */
function buildPlayerCharacterExBoost(exBoostStatusId, exBoostAbilityIdList) {
    if (exBoostStatusId === null || exBoostAbilityIdList === null)
        return undefined;
    return {
        statusId: exBoostStatusId,
        abilityIdList: (0, utils_2.deserializeNumberList)(exBoostAbilityIdList)
    };
}
/**
 * Converts a RawPlayerCharacter into a PlayerCharacter
 *
 * @param rawCharacter The RawPlayerCharacter to convert.
 * @param bondTokens The character's bond tokens
 * @returns The converted PlayerCharacter
 */
function buildPlayerCharacter(rawCharacter, bondTokens) {
    return {
        entryCount: rawCharacter.entry_count,
        evolutionLevel: rawCharacter.evolution_level,
        overLimitStep: rawCharacter.over_limit_step,
        protection: (0, utils_2.deserializeBoolean)(rawCharacter.protection),
        joinTime: new Date(rawCharacter.join_time),
        updateTime: new Date(rawCharacter.update_time),
        exp: rawCharacter.exp,
        stack: rawCharacter.stack,
        manaBoardIndex: rawCharacter.mana_board_index,
        exBoost: buildPlayerCharacterExBoost(rawCharacter.ex_boost_status_id, rawCharacter.ex_boost_ability_id_list),
        illustrationSettings: rawCharacter.illustration_settings === null ? undefined : (0, utils_2.deserializeNumberList)(rawCharacter.illustration_settings),
        bondTokenList: bondTokens
    };
}
/**
 * Checks whether a player owns a given character or not.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character.
 * @returns A boolean, stating whether the player owns the character.
 */
function playerOwnsCharacterSync(playerId, characterId) {
    return db.prepare(`
    SELECT id
    FROM players_characters
    WHERE player_id = ? AND id = ?
    `).get(playerId, characterId) !== undefined;
}
exports.playerOwnsCharacterSync = playerOwnsCharacterSync;
/**
 * Gets a singular character from a player's data.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character.
 * @returns The PlayerCharacter or null if it doesn't exist.
 */
function getPlayerCharacterSync(playerId, characterId) {
    const rawCharacter = db.prepare(`
    SELECT id, entry_count, evolution_level, over_limit_step, protection,
        join_time, update_time, exp, stack, mana_board_index, ex_boost_status_id,
        ex_boost_ability_id_list, illustration_settings
    FROM players_characters
    WHERE player_id = ? AND id = ?
    `).get(playerId, characterId);
    if (rawCharacter === undefined)
        return null;
    // get bond tokens
    const rawBondTokens = db.prepare(`
    SELECT mana_board_index, status, character_id
    FROM players_characters_bond_tokens
    WHERE player_id = ? AND character_id = ?
    `).all(playerId, characterId);
    return buildPlayerCharacter(rawCharacter, rawBondTokens.map(raw => buildCharacterBondToken(raw)));
}
exports.getPlayerCharacterSync = getPlayerCharacterSync;
/**
 * Gets a list of all of the characters that a player owns.
 *
 * @param playerId The ID of the player.
 * @returns A list of the characters that the player owns.
 */
function getPlayerCharactersSync(playerId) {
    const rawCharacters = db.prepare(`
    SELECT id, entry_count, evolution_level, over_limit_step, protection,
        join_time, update_time, exp, stack, mana_board_index, ex_boost_status_id,
        ex_boost_ability_id_list, illustration_settings
    FROM players_characters
    WHERE player_id = ?
    `).all(playerId);
    // get bond tokens
    const rawBondTokens = db.prepare(`
    SELECT mana_board_index, status, character_id
    FROM players_characters_bond_tokens
    WHERE player_id = ?
    `).all(playerId);
    const bondBuckets = {};
    for (const rawBondToken of rawBondTokens) {
        const characterId = rawBondToken.character_id.toString();
        let bucket = bondBuckets[characterId];
        if (!bucket) {
            bucket = [];
            bondBuckets[characterId] = bucket;
        }
        bucket.push(buildCharacterBondToken(rawBondToken));
    }
    const out = {};
    for (const rawCharacter of rawCharacters) {
        const id = rawCharacter.id.toString();
        out[id] = buildPlayerCharacter(rawCharacter, bondBuckets[id] || []);
    }
    return out;
}
exports.getPlayerCharactersSync = getPlayerCharactersSync;
/**
 * Inserts a single character's bond token into a player's data.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character.
 * @param bondToken The bond token to insert.
 */
function insertPlayerCharacterBondTokenSync(playerId, characterId, bondToken) {
    db.prepare(`
    INSERT INTO players_characters_bond_tokens (mana_board_index, status, player_id, character_id)
    VALUES (?, ?, ?, ?)
    `).run(bondToken.manaBoardIndex, bondToken.status, playerId, Number(characterId));
}
/**
 * Updates a player's character's bond token.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character.
 * @param bondToken The updated bondToken.
 */
function updatePlayerCharacterBondTokenSync(playerId, characterId, bondToken) {
    db.prepare(`
    UPDATE players_characters_bond_tokens
    SET status = ?
    WHERE player_id = ? AND character_id = ?
    `).run(bondToken.status, playerId, Number(characterId));
}
exports.updatePlayerCharacterBondTokenSync = updatePlayerCharacterBondTokenSync;
/**
 * Inserts a single character into a player's inventory.
 *
 * @param playerId The ID of the player to add the character to.
 * @param characterId The ID of the character to add.
 * @param character The character data.
 */
function insertPlayerCharacterSync(playerId, characterId, character) {
    var _a, _b;
    // insert into characters table
    db.prepare(`
    INSERT INTO players_characters (id, entry_count, evolution_level, over_limit_step, 
        protection, join_time, update_time, exp, stack, mana_board_index, player_id,
        ex_boost_status_id, ex_boost_ability_id_list, illustration_settings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(Number(characterId), character.entryCount, character.evolutionLevel, character.overLimitStep, (0, utils_2.serializeBoolean)(character.protection), character.joinTime.toISOString(), character.updateTime.toISOString(), character.exp, character.stack, character.manaBoardIndex, playerId, ((_a = character.exBoost) === null || _a === void 0 ? void 0 : _a.statusId) === undefined ? null : character.exBoost.statusId, ((_b = character.exBoost) === null || _b === void 0 ? void 0 : _b.abilityIdList) === undefined ? null : (0, utils_2.serializeNumberList)(character.exBoost.abilityIdList), character.illustrationSettings === undefined ? null : (0, utils_2.serializeNumberList)(character.illustrationSettings));
    // insert mana board nodes
    for (const token of character.bondTokenList) {
        insertPlayerCharacterBondTokenSync(playerId, characterId, token);
    }
}
exports.insertPlayerCharacterSync = insertPlayerCharacterSync;
/**
 * Inserts a default single character into a player's inventory.
 *
 * @param playerId The ID of the player to add the character to.
 * @param characterId The ID of the character to add.
 */
function insertDefaultPlayerCharacterSync(playerId, characterId) {
    const dateNow = new Date();
    insertPlayerCharacterSync(playerId, characterId, {
        entryCount: 1,
        evolutionLevel: 0,
        overLimitStep: 0,
        protection: false,
        joinTime: dateNow,
        updateTime: dateNow,
        exp: 0,
        stack: 0,
        manaBoardIndex: 1,
        bondTokenList: [
            {
                manaBoardIndex: 1,
                status: 0
            },
            {
                manaBoardIndex: 2,
                status: 0
            }
        ]
    });
}
exports.insertDefaultPlayerCharacterSync = insertDefaultPlayerCharacterSync;
/**
 * Batch inserts a record of characters into a player's inventory.
 *
 * @param playerId The ID of the player.
 * @param characters The record of characters to insert.
 */
function insertPlayerCharactersSync(playerId, characters) {
    db.transaction(() => {
        for (const [characterId, data] of Object.entries(characters)) {
            insertPlayerCharacterSync(playerId, characterId, data);
        }
    })();
}
/**
 * Updates a single character within a player's data.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character.
 * @param character The partial data of the character to update.
 */
function updatePlayerCharacterSync(playerId, characterId, character) {
    const fieldMap = {
        'entryCount': 'entry_count',
        'evolutionLevel': 'evolution_level',
        'overLimitStep': 'over_limit_step',
        'protection': 'protection',
        'joinTime': 'join_time',
        'updateTime': 'update_time',
        'exp': 'exp',
        'stack': 'stack',
        'manaBoardIndex': 'mana_board_index'
    };
    // set the update time to now
    character.updateTime = new Date();
    const sets = [];
    const values = [];
    for (const key in character) {
        const value = character[key];
        const mapped = fieldMap[key];
        if (mapped && value !== undefined) {
            sets.push(`${mapped} = ?`);
            if (value instanceof Date) {
                values.push(value.toISOString());
            }
            else if (typeof (value) === "boolean") {
                values.push((0, utils_2.serializeBoolean)(value));
            }
            else {
                values.push(value);
            }
        }
    }
    const exBoost = character.exBoost;
    if (exBoost !== undefined) {
        sets.push('ex_boost_status_id = ?');
        sets.push('ex_boost_ability_id_list = ?');
        values.push(exBoost.statusId);
        values.push((0, utils_2.serializeNumberList)(exBoost.abilityIdList));
    }
    const illustration_settings = character.illustrationSettings;
    if (illustration_settings !== undefined) {
        sets.push('illustration_settings = ?');
        values.push((0, utils_2.serializeNumberList)(illustration_settings));
    }
    if (sets.length > 0)
        db.prepare(`
        UPDATE players_characters
        SET ${sets.join(', ')}
        WHERE id = ? AND player_id = ?
        `).run([...values, characterId, playerId]);
}
exports.updatePlayerCharacterSync = updatePlayerCharacterSync;
/**
 * Retrieves the mana node statuses of a player's characters.
 *
 * @param playerId The ID of the player.
 * @returns A record containing the statuses of the player's characters.
 */
function getPlayerCharactersManaNodesSync(playerId) {
    const rawNodes = db.prepare(`
    SELECT value, character_id
    FROM players_characters_mana_nodes
    WHERE player_id = ?
    `).all(playerId);
    const buckets = {};
    for (const rawNode of rawNodes) {
        const characterId = rawNode.character_id.toString();
        let bucket = buckets[characterId];
        if (!bucket) {
            bucket = [];
            buckets[characterId] = bucket;
        }
        bucket.push(rawNode.value);
    }
    return buckets;
}
exports.getPlayerCharactersManaNodesSync = getPlayerCharactersManaNodesSync;
/**
 * Gets all of the mana nodes that a player has unlocked for a specific character.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character.
 * @returns A list of unlocked mana node ids.
 */
function getPlayerCharacterManaNodesSync(playerId, characterId) {
    const rawNodes = db.prepare(`
    SELECT value, character_id
    FROM players_characters_mana_nodes
    WHERE character_id = ? AND player_id = ?
    `).all(characterId, playerId);
    return rawNodes.map(rawNode => rawNode.value);
}
exports.getPlayerCharacterManaNodesSync = getPlayerCharacterManaNodesSync;
/**
 * Checks whether a player has unlocked a specific mana node.
 *
 * @param playerId The ID of the player to check.
 * @param characterId The ID of the character.
 * @param manaNodeId The ID of the mana node.
 * @returns Whether the specified mana node has been unlocked or not.
 */
function hasPlayerUnlockedCharacterManaNodeSync(playerId, characterId, manaNodeId) {
    return db.prepare(`
    SELECT value
    FROM players_characters_mana_nodes
    WHERE player_id = ? AND character_id = ? AND value = ?
    `).get(playerId, characterId, Number(manaNodeId)) !== undefined;
}
exports.hasPlayerUnlockedCharacterManaNodeSync = hasPlayerUnlockedCharacterManaNodeSync;
/**
 * Inserts mana nodes for a particular character into the database.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character to insert the mana nodes of.
 * @param manaNodes The mana nodes values to insert.
 */
function insertPlayerCharacterManaNodesSync(playerId, characterId, manaNodes) {
    for (const node of manaNodes) {
        db.prepare(`
        INSERT INTO players_characters_mana_nodes (value, character_id, player_id)
        VALUES (?, ?, ?)
        `).run(node, Number(characterId), playerId);
    }
}
exports.insertPlayerCharacterManaNodesSync = insertPlayerCharacterManaNodesSync;
/**
 * Batch inserts a record of characters' mana nodes into the database.
 *
 * @param playerId The ID of the player.
 * @param charactersManaNodes The record of character mana node values.
 */
function insertPlayerCharactersManaNodesSync(playerId, charactersManaNodes) {
    db.transaction(() => {
        for (const [characterId, manaNodes] of Object.entries(charactersManaNodes)) {
            insertPlayerCharacterManaNodesSync(playerId, characterId, manaNodes);
        }
    })();
}
/**
 * Fetches a player's party group layout.
 *
 * @param playerId The ID of the player.
 * @param category The category of parties to get.
 * @returns The data for each of the player's parties.
 */
function getPlayerPartyGroupListSync(playerId, category = types_1.PartyCategory.NORMAL) {
    // get party groups
    const rawPartyGroups = db.prepare(`
    SELECT id, color_id, category
    FROM players_party_groups
    WHERE player_id = ? AND category = ?
    `).all(playerId, category);
    // get raw parties
    const rawParties = db.prepare(`
    SELECT slot, name, character_id_1, character_id_2, character_id_3, unison_character_1,
        unison_character_2, unison_character_3, equipment_1, equipment_2, equipment_3,
        ability_soul_1, ability_soul_2, ability_soul_3, edited, group_id, category
    FROM players_parties
    WHERE player_id = ? AND category = ?
    `).all(playerId, category);
    const groupLists = {};
    for (const rawParty of rawParties) {
        const groupId = rawParty.group_id.toString();
        let bucket = groupLists[groupId];
        if (!bucket) {
            bucket = {};
            groupLists[groupId] = bucket;
        }
        bucket[rawParty.slot.toString()] = {
            name: rawParty.name,
            characterIds: [rawParty.character_id_1, rawParty.character_id_2, rawParty.character_id_3],
            unisonCharacterIds: [rawParty.unison_character_1, rawParty.unison_character_2, rawParty.unison_character_3],
            equipmentIds: [rawParty.equipment_1, rawParty.equipment_2, rawParty.equipment_3],
            abilitySoulIds: [rawParty.ability_soul_1, rawParty.ability_soul_2, rawParty.ability_soul_3],
            edited: (0, utils_2.deserializeBoolean)(rawParty.edited),
            options: {
                allowOtherPlayersToHealMe: true
            },
            category: rawParty.category
        };
    }
    const final = {};
    for (const rawPartyGroup of rawPartyGroups) {
        const id = rawPartyGroup.id.toString();
        final[id] = {
            list: groupLists[id] || [],
            colorId: rawPartyGroup.color_id,
            category: rawPartyGroup.category
        };
    }
    return final;
}
exports.getPlayerPartyGroupListSync = getPlayerPartyGroupListSync;
/**
 * Inserts a single party into the database.
 *
 * @param playerId The player's ID.
 * @param slot The party's slot number.
 * @param groupId The group that the party belongs to.
 * @param party The party data.
 */
function insertPlayerPartySync(playerId, slot, groupId, party) {
    db.prepare(`
    INSERT INTO players_parties (slot, name, character_id_1, character_id_2, character_id_3, 
        unison_character_1, unison_character_2, unison_character_3, equipment_1, equipment_2,
        equipment_3, ability_soul_1, ability_soul_2, ability_soul_3, edited, player_id, group_id, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(Number(slot), party.name, party.characterIds[0] || null, party.characterIds[1] || null, party.characterIds[2] || null, party.unisonCharacterIds[0] || null, party.unisonCharacterIds[1] || null, party.unisonCharacterIds[2] || null, party.equipmentIds[0] || null, party.equipmentIds[1] || null, party.equipmentIds[2] || null, party.abilitySoulIds[0] || null, party.abilitySoulIds[1] || null, party.abilitySoulIds[2] || null, (0, utils_2.serializeBoolean)(party.edited), playerId, Number(groupId), party.category);
}
/**
 * Inserts a player party group into the database.
 *
 * @param playerId The player's ID.
 * @param groupId The ID of the group.
 * @param group The group data.
 */
function insertPlayerPartyGroupSync(playerId, groupId, group) {
    // insert the group data
    db.prepare(`
    INSERT INTO players_party_groups (id, color_id, player_id, category)
    VALUES (?, ?, ?, ?)
    `).run(Number(groupId), group.colorId, playerId, group.category);
    // insert the parties
    for (const [slot, party] of Object.entries(group.list)) {
        insertPlayerPartySync(playerId, slot, groupId, party);
    }
}
/**
 * Batch inserts a record of PlayerPartyGroups into the database.
 *
 * @param playerId The ID of the player.
 * @param groups The record of groups to insert.
 */
function insertPlayerPartyGroupListSync(playerId, groups) {
    db.transaction(() => {
        for (const [groupId, group] of Object.entries(groups)) {
            insertPlayerPartyGroupSync(playerId, groupId, group);
        }
    })();
}
exports.insertPlayerPartyGroupListSync = insertPlayerPartyGroupListSync;
/**
 * Updates a singular party within a player's data.
 *
 * @param playerId The ID of the player.
 * @param slot The slot of the party to update.
 * @param party The party data to update.
 */
function updatePlayerPartySync(playerId, slot, party) {
    db.prepare(`
    UPDATE players_parties
    SET name = ?,
        character_id_1 = ?,
        character_id_2 = ?,
        character_id_3 = ?,
        unison_character_1 = ?,
        unison_character_2 = ?,
        unison_character_3 = ?,
        equipment_1 = ?,
        equipment_2 = ?,
        equipment_3 = ?,
        ability_soul_1 = ?,
        ability_soul_2 = ?,
        ability_soul_3 = ?,
        edited = ?
    WHERE slot = ? AND player_id = ? AND category = ?
    `).run(party.name, party.characterIds[0], party.characterIds[1], party.characterIds[2], party.unisonCharacterIds[0], party.unisonCharacterIds[1], party.unisonCharacterIds[2], party.equipmentIds[0], party.equipmentIds[1], party.equipmentIds[2], party.abilitySoulIds[0], party.abilitySoulIds[1], party.abilitySoulIds[2], (0, utils_2.serializeBoolean)(party.edited), slot, playerId, party.category);
}
exports.updatePlayerPartySync = updatePlayerPartySync;
function updatePlayerPartyGroupSync(playerId, groupId, colorId, category = types_1.PartyCategory.NORMAL) {
    db.prepare(`
    UPDATE players_party_groups
    SET color_id = ?
    WHERE id = ? AND player_id = ? AND category = ?
    `).run(colorId, groupId, playerId, category);
}
exports.updatePlayerPartyGroupSync = updatePlayerPartyGroupSync;
/**
 * Gets the amount of a singular item that a player owns.
 *
 * @param playerId The ID of the player.
 * @param itemId The ID of the item.
 * @returns The amount of the item that the player owns, or null, indicating no ownership.
 */
function getPlayerItemSync(playerId, itemId) {
    const rawItem = db.prepare(`
    SELECT id, amount
    FROM players_items
    WHERE player_id = ? AND id = ?
    `).get(playerId, Number(itemId));
    return rawItem === undefined ? null : rawItem.amount;
}
exports.getPlayerItemSync = getPlayerItemSync;
/**
 * Gets the items that a player owns.
 *
 * @param playerId The ID of the player.
 * @returns A record where the index is the item's ID and the value is the item's amount.
 */
function getPlayerItemsSync(playerId) {
    const rawItems = db.prepare(`
    SELECT id, amount
    FROM players_items
    WHERE player_id = ?
    `).all(playerId);
    const output = {};
    for (const rawItem of rawItems) {
        output[rawItem.id.toString()] = rawItem.amount;
    }
    return output;
}
exports.getPlayerItemsSync = getPlayerItemsSync;
/**
 * Inserts a singular item into the player's inventory.
 *
 * @param playerId The ID of the player.
 * @param itemId The ID of the item to insert.
 * @param amount The amount of the item to insert.
 */
function insertPlayerItemSync(playerId, itemId, amount) {
    db.prepare(`
    INSERT INTO players_items (id, amount, player_id)
    VALUES (?, ?, ?)
    `).run(Number(itemId), amount, playerId);
}
/**
 * Batch inserts a record of player items into a player's inventory.
 *
 * @param playerId The ID of the player.
 * @param items The record of items.
 */
function insertPlayerItemsSync(playerId, items) {
    db.transaction(() => {
        for (const [itemId, amount] of Object.entries(items)) {
            insertPlayerItemSync(playerId, itemId, amount);
        }
    })();
}
/**
 * Updates a player's item's amount.
 *
 * @param playerId The ID of the player.
 * @param itemId The item's ID.
 * @param amount The new amount the item should have.
 */
function updatePlayerItemSync(playerId, itemId, amount) {
    db.prepare(`
    UPDATE players_items
    SET amount = ?
    WHERE player_id = ? AND id = ?
    `).run(amount, playerId, Number(itemId));
}
exports.updatePlayerItemSync = updatePlayerItemSync;
/**
 * Gives a player giveAmount of an item.
 *
 * @param playerId The ID of the player.
 * @param itemId The ID of the item.
 * @param giveAmount The amount of the item to give.
 * @returns The new total amount of the item that the player owns.
 */
function givePlayerItemSync(playerId, itemId, giveAmount) {
    // check if the player owns the item
    const ownedAmount = getPlayerItemSync(playerId, itemId);
    if (ownedAmount === null) {
        insertPlayerItemSync(playerId, itemId, giveAmount);
        return giveAmount;
    }
    else {
        const newAmount = ownedAmount + giveAmount;
        updatePlayerItemSync(playerId, itemId, newAmount);
        return newAmount;
    }
}
exports.givePlayerItemSync = givePlayerItemSync;
/**
 * Converts a RawPlayerEquipment object into a PlayerEquipment object.
 *
 * @param rawEquipment The raw equipment to deserialize.
 * @returns A deserialized PlayerEquipment object.
 */
function buildPlayerEquipment(rawEquipment) {
    return {
        level: rawEquipment.level,
        enhancementLevel: rawEquipment.enhancement_level,
        protection: (0, utils_2.deserializeBoolean)(rawEquipment.protection),
        stack: rawEquipment.stack,
    };
}
/**
 * Retrieves all of the equipment that a player owns.
 *
 * @param playerId The ID of the player.
 * @returns A record where the index is the equipment's ID and the value is its data.
 */
function getPlayerEquipmentListSync(playerId) {
    const rawEquipment = db.prepare(`
    SELECT id, level, enhancement_level, protection, stack
    FROM players_equipment
    WHERE player_id = ?
    `).all(playerId);
    const final = {};
    for (const raw of rawEquipment) {
        final[raw.id.toString()] = buildPlayerEquipment(raw);
    }
    return final;
}
exports.getPlayerEquipmentListSync = getPlayerEquipmentListSync;
/**
 * Gets the data for a single piece of equipment from a player's inventory.
 *
 * @param playerId The player's ID.
 * @param equipmentId The ID of the equipment to get the data of.
 * @returns If the equipment was found, returns a PlayerEquipment object. Otherwise, returns null.
 */
function getPlayerEquipmentSync(playerId, equipmentId) {
    const rawEquipment = db.prepare(`
    SELECT id, level, enhancement_level, protection, stack
    FROM players_equipment
    WHERE player_id = ? AND id = ?
    `).get(playerId, Number(equipmentId));
    return rawEquipment === undefined ? null : buildPlayerEquipment(rawEquipment);
}
exports.getPlayerEquipmentSync = getPlayerEquipmentSync;
/**
 * Checks whether a player owns a given equipment or not.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character.
 * @returns A boolean, stating whether the player owns the character.
 */
function playerOwnsEquipmentSync(playerId, equipmentId) {
    return db.prepare(`
    SELECT id
    FROM players_equipment
    WHERE id = ? AND player_id = ?
    `).get(equipmentId, playerId) !== undefined;
}
exports.playerOwnsEquipmentSync = playerOwnsEquipmentSync;
/**
 * Inserts a singular equipment into a player's inventory.
 *
 * @param playerId The ID of the player.
 * @param equipmentId The ID of the equipment to insert.
 * @param equipment The equipment's data.
 */
function insertPlayerEquipmentSync(playerId, equipmentId, equipment) {
    db.prepare(`
    INSERT INTO players_equipment (id, level, enhancement_level, protection, stack, player_id)
    VALUES (?, ?, ?, ?, ?, ?)
    `).run(Number(equipmentId), equipment.level, equipment.enhancementLevel, (0, utils_2.serializeBoolean)(equipment.protection), equipment.stack, playerId);
}
exports.insertPlayerEquipmentSync = insertPlayerEquipmentSync;
/**
 * Batch inserts a record of equipment into a player's inventory.
 *
 * @param playerId The ID of the player.
 * @param equipment The record of equipment.
 */
function insertPlayerEquipmentListSync(playerId, equipment) {
    db.transaction(() => {
        for (const [equipmentId, data] of Object.entries(equipment)) {
            insertPlayerEquipmentSync(playerId, equipmentId, data);
        }
    })();
}
/**
 * Updates a piece of a player's equipment.
 *
 * @param playerId The ID of the player.
 * @param equipmentId The ID of the equipment to update.
 * @param equipment A partial with the values to change inside of it.
 */
function updatePlayerEquipmentSync(playerId, equipmentId, equipment) {
    const fieldMap = {
        'level': 'level',
        'enhancementLevel': 'enhancement_level',
        'protection': 'protection',
        'stack': 'stack'
    };
    const sets = [];
    const values = [];
    for (const key in equipment) {
        const value = equipment[key];
        const mapped = fieldMap[key];
        if (mapped && value !== undefined) {
            sets.push(`${mapped} = ?`);
            if (typeof (value) === "boolean") {
                values.push((0, utils_2.serializeBoolean)(value));
            }
            else {
                values.push(value);
            }
        }
    }
    if (sets.length > 0)
        db.prepare(`
        UPDATE players_equipment
        SET ${sets.join(', ')}
        WHERE id = ? AND player_id = ?
        `).run([...values, Number(equipmentId), playerId]);
}
exports.updatePlayerEquipmentSync = updatePlayerEquipmentSync;
/**
 * Deletes a piece of equipment from a player's inventory.
 *
 * @param playerId The ID of the player.
 * @param equipmentId The ID of the equipment to delete.
 */
function deletePlayerEquipmentSync(playerId, equipmentId) {
    db.prepare(`
    DELETE FROM players_equipment
    WHERE id = ? AND player_id = ?
    `).run(Number(equipmentId), playerId);
}
exports.deletePlayerEquipmentSync = deletePlayerEquipmentSync;
/**
 * Converts a RawPlayerQuestProgress object into a PlayerQuestProgress object.
 *
 * @param raw The raw object to convert.
 * @returns The converted object.
 */
function buildPlayerQuestProgress(raw) {
    return {
        questId: raw.quest_id,
        finished: (0, utils_2.deserializeBoolean)(raw.finished),
        highScore: raw.high_score,
        clearRank: raw.clear_rank,
        bestElapsedTimeMs: raw.best_elapsed_time_ms
    };
}
/**
 * Gets a player's overall quest progressfrom the database.
 *
 * @param playerId The player's ID.
 * @returns A record where the index is the section and the value is a list of PlayerQuestProgress.
 */
function getPlayerQuestProgressSync(playerId) {
    const rawProgress = db.prepare(`
    SELECT section, quest_id, finished, high_score, clear_rank, best_elapsed_time_ms
    FROM players_quest_progress
    WHERE player_id = ?
    `).all(playerId);
    const mapped = {};
    for (const raw of rawProgress) {
        const section = raw.section.toString();
        let bucket = mapped[section];
        if (!bucket) {
            bucket = [];
            mapped[section] = bucket;
        }
        bucket.push(buildPlayerQuestProgress(raw));
    }
    return mapped;
}
exports.getPlayerQuestProgressSync = getPlayerQuestProgressSync;
/**
 * Gets the progress of a singular quest for a player..
 *
 * @param playerId The ID of the player.
 * @param section The section of the quest.
 * @param questId The ID of the quest.
 * @returns The quest's progress data, or null if it doesn't exist.
 */
function getPlayerSingleQuestProgressSync(playerId, section, questId) {
    const rawProgress = db.prepare(`
    SELECT section, quest_id, finished, high_score, clear_rank, best_elapsed_time_ms
    FROM players_quest_progress
    WHERE player_id = ? AND section = ? AND quest_id = ?
    `).get(playerId, Number(section), Number(questId));
    if (rawProgress === undefined)
        return null;
    return buildPlayerQuestProgress(rawProgress);
}
exports.getPlayerSingleQuestProgressSync = getPlayerSingleQuestProgressSync;
/**
 * Inserts a singular quest progress into the database.
 *
 * @param playerId The ID of the player.
 * @param section The section that this quest progress belongs to.
 * @param data The data of this quest progress.
 */
function insertPlayerQuestProgressSync(playerId, section, data) {
    db.prepare(`
    INSERT INTO players_quest_progress (section, quest_id, finished, high_score, clear_rank, best_elapsed_time_ms, player_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(Number(section), data.questId, (0, utils_2.serializeBoolean)(data.finished), data.highScore || null, data.clearRank || null, data.bestElapsedTimeMs || null, playerId);
}
exports.insertPlayerQuestProgressSync = insertPlayerQuestProgressSync;
/**
 * Batch inserts a record of quest progress into the database.
 *
 * @param playerId The player's ID.
 * @param progressList The record of quest progress.
 */
function insertPlayerQuestProgressListSync(playerId, progressList) {
    db.transaction(() => {
        for (const [section, progresses] of Object.entries(progressList)) {
            for (const progress of progresses) {
                insertPlayerQuestProgressSync(playerId, section, progress);
            }
        }
    })();
}
/**
 * Updates the progress for a single player's quest.
 *
 * @param playerId The ID of the player.
 * @param section The section that the quest belongs to.
 * @param data The partial data of the quest progress to update.
 */
function updatePlayerQuestProgressSync(playerId, section, data) {
    const fieldMap = {
        'finished': 'finished',
        'highScore': 'high_score',
        'clearRank': 'clear_rank',
        'bestElapsedTimeMs': 'best_elapsed_time_ms'
    };
    const sets = [];
    const values = [];
    for (const key in data) {
        const value = data[key];
        const mapped = fieldMap[key];
        if (mapped && value !== undefined) {
            sets.push(`${mapped} = ?`);
            if (typeof (value) === "boolean") {
                values.push((0, utils_2.serializeBoolean)(value));
            }
            else {
                values.push(value);
            }
        }
    }
    if (sets.length > 0)
        db.prepare(`
        UPDATE players_quest_progress
        SET ${sets.join(', ')}
        WHERE section = ? AND quest_id = ? AND player_id = ?
        `).run([...values, Number(section), data.questId, playerId]);
}
exports.updatePlayerQuestProgressSync = updatePlayerQuestProgressSync;
/**
 * Converts a RawPlayerGachaInfo object into a PlayerGachaInfo object.
 *
 * @param rawInfo The raw object to convert.
 * @returns The converted object.
 */
function buildPlayerGachaInfo(rawInfo) {
    return {
        gachaId: rawInfo.gacha_id,
        isDailyFirst: (0, utils_2.deserializeBoolean)(rawInfo.is_daily_first),
        isAccountFirst: (0, utils_2.deserializeBoolean)(rawInfo.is_account_first),
        gachaExchangePoint: rawInfo.gacha_exchange_point
    };
}
/**
 * Retrieves the status of various gacha banners for the player.
 *
 * @param playerId The ID of the player.
 * @returns A list of PlayerGachaInfo.
 */
function getPlayerGachaInfoListSync(playerId) {
    const rawInfo = db.prepare(`
    SELECT gacha_id, is_daily_first, is_account_first, gacha_exchange_point
    FROM players_gacha_info
    WHERE player_id = ?
    `).all(playerId);
    return rawInfo.map(raw => {
        return buildPlayerGachaInfo(raw);
    });
}
exports.getPlayerGachaInfoListSync = getPlayerGachaInfoListSync;
/**
 * Gets an individual gacha info for a player.
 *
 * @param playerId The ID of the player.
 * @param gachaId The ID of the gacha.
 * @returns The info that corresponds to the provided gachaId, or null.
 */
function getPlayerGachaInfoSync(playerId, gachaId) {
    const rawInfo = db.prepare(`
    SELECT gacha_id, is_daily_first, is_account_first, gacha_exchange_point
    FROM players_gacha_info
    WHERE player_id = ? AND gacha_id = ?
    `).get(playerId, gachaId);
    return rawInfo === undefined ? null : buildPlayerGachaInfo(rawInfo);
}
exports.getPlayerGachaInfoSync = getPlayerGachaInfoSync;
/**
 * Inserts a singular gacha info into the database for a player.
 *
 * @param playerId The ID of the player.
 * @param gachaInfo The PlayerGachaInfo data.
 */
function insertPlayerGachaInfoSync(playerId, gachaInfo) {
    db.prepare(`
    INSERT INTO players_gacha_info (gacha_id, is_daily_first, is_account_first, gacha_exchange_point, player_id)
    VALUES (?, ?, ?, ?, ?)
    `).run(gachaInfo.gachaId, (0, utils_2.serializeBoolean)(gachaInfo.isDailyFirst), (0, utils_2.serializeBoolean)(gachaInfo.isAccountFirst), gachaInfo.gachaExchangePoint == undefined ? null : gachaInfo.gachaExchangePoint, playerId);
}
exports.insertPlayerGachaInfoSync = insertPlayerGachaInfoSync;
/**
 * Batch inserts a list of gacha info into the database.
 *
 * @param playerId The player's ID.
 * @param gachaInfoList The list of of PlayerGachaInfo data.
 */
function insertPlayerGachaInfoListSync(playerId, gachaInfoList) {
    db.transaction(() => {
        for (const gachaInfo of gachaInfoList) {
            insertPlayerGachaInfoSync(playerId, gachaInfo);
        }
    })();
}
/**
 * Updates a player's gacha info.
 *
 * @param playerId The ID of the player.
 * @param gachaInfo The partial PlayerGachaInfo object containing data to update.
 */
function updatePlayerGachaInfoSync(playerId, gachaInfo) {
    const id = gachaInfo.gachaId;
    const fieldMap = {
        'isDailyFirst': 'is_daily_first',
        'isAccountFirst': 'is_account_first',
        'gachaExchangePoint': 'gacha_exchange_point'
    };
    const sets = [];
    const values = [];
    for (const key in gachaInfo) {
        const value = gachaInfo[key];
        const mapped = fieldMap[key];
        if (mapped && value !== undefined) {
            sets.push(`${mapped} = ?`);
            if (typeof (value) === "boolean") {
                values.push((0, utils_2.serializeBoolean)(value));
            }
            else {
                values.push(value);
            }
        }
    }
    if (sets.length > 0)
        db.prepare(`
        UPDATE players_gacha_info
        SET ${sets.join(', ')}
        WHERE gacha_id = ? AND player_id = ?
        `).run([...values, id, playerId]);
}
exports.updatePlayerGachaInfoSync = updatePlayerGachaInfoSync;
/**
 * Converts a RawPlayerGachaCampaign into a PlayerGachaCampaign.
 *
 * @param raw The RawPlayerGachaCampaign to convert.
 * @returns The converted PlayerGachaCampaign.
 */
function buildPlayerGachaCampaign(raw) {
    return {
        gachaId: raw.gacha_id,
        campaignId: raw.campaign_id,
        count: raw.count
    };
}
/**
 * Gets the status of an individual gacha campaign.
 *
 * @param playerId The ID of the player.
 * @param gachaId The ID of the gacha.
 * @param campaignId The ID of the gacha campaign.
 * @returns A PlayerGachaCampaign object or null.
 */
function getPlayerGachaCampaignSync(playerId, gachaId, campaignId) {
    const raw = db.prepare(`
    SELECT gacha_id, campaign_id, count
    FROM players_gacha_campaigns
    WHERE player_id = ? AND gacha_id = ? AND campaign_id = ?
    `).get(playerId, gachaId, campaignId);
    return raw === undefined ? null : buildPlayerGachaCampaign(raw);
}
exports.getPlayerGachaCampaignSync = getPlayerGachaCampaignSync;
/**
 * Batch gets a list of player gacha campaigns.
 *
 * @param playerId The ID of the player.
 * @returns The list of gacha campaigns.
 */
function getPlayerGachaCampaignListSync(playerId) {
    const rawList = db.prepare(`
    SELECT gacha_id, campaign_id, count
    FROM players_gacha_campaigns
    WHERE player_id = ?
    `).all(playerId);
    return rawList.map(raw => buildPlayerGachaCampaign(raw));
}
exports.getPlayerGachaCampaignListSync = getPlayerGachaCampaignListSync;
/**
 * Inserts a gacha campaign into a player's data.
 *
 * @param playerId The ID of the player.
 * @param campaign The campaign to insert.
 */
function insertPlayerGachaCampaignSync(playerId, campaign) {
    db.prepare(`
    INSERT INTO players_gacha_campaigns (gacha_id, campaign_id, count, player_id)
    VALUES (?, ?, ?, ?)
    `).run(campaign.gachaId, campaign.campaignId, campaign.count, playerId);
}
exports.insertPlayerGachaCampaignSync = insertPlayerGachaCampaignSync;
function insertPlayerGachaCampaignListSync(playerId, campaigns) {
    db.transaction(() => {
        for (const campaign of campaigns) {
            insertPlayerGachaCampaignSync(playerId, campaign);
        }
    })();
}
/**
 * Updates a player's gacha campaign.
 *
 * @param playerId The ID of the player.
 * @param gachaId The ID of the gacha.
 * @param campaignId The ID of the gacha campaign.
 * @param newCount The new count the gacha campaign should have.
 */
function updatePlayerGachaCampaignSync(playerId, gachaId, campaignId, newCount) {
    db.prepare(`
    UPDATE players_gacha_campaigns
    SET count = ?
    WHERE player_id = ? AND gacha_id = ? AND campaign_id = ?
    `).run(newCount, playerId, gachaId, campaignId);
}
exports.updatePlayerGachaCampaignSync = updatePlayerGachaCampaignSync;
/**
 * Gets a player's drawn quests list.
 *
 * @param playerId The player's ID.
 * @returns A list of the player's drawn quests.
 */
function getPlayerDrawnQuestsSync(playerId) {
    const rawQuests = db.prepare(`
    SELECT category_id, quest_id, odds_id
    FROM players_drawn_quests
    WHERE player_id = ?
    `).all(playerId);
    return rawQuests.map(raw => {
        return {
            categoryId: raw.category_id,
            questId: raw.quest_id,
            oddsId: raw.odds_id
        };
    });
}
exports.getPlayerDrawnQuestsSync = getPlayerDrawnQuestsSync;
/**
 * Inserts a singular drawn quest into a player's data.
 *
 * @param playerId The ID of the player.
 * @param drawnQuest The drawn quest to insert.
 */
function insertPlayerDrawnQuestSync(playerId, drawnQuest) {
    db.prepare(`
    INSERT INTO players_drawn_quests (category_id, quest_id, odds_id, player_id)
    VALUES (?, ?, ?, ?)    
    `).run(drawnQuest.categoryId, drawnQuest.questId, drawnQuest.oddsId, playerId);
}
/**
 * Batch inserts a list of drawn quests into the database.
 *
 * @param playerId The ID of the player.
 * @param drawnQuests The list of drawn quests to insert.
 */
function insertPlayerDrawnQuestsSync(playerId, drawnQuests) {
    db.transaction(() => {
        for (const drawnQuest of drawnQuests) {
            insertPlayerDrawnQuestSync(playerId, drawnQuest);
        }
    })();
}
/**
 * Gets a player's periodic reward point list.
 *
 * @param playerId The ID of the player.
 * @returns A list of the player's periodic reward points
 */
function getPlayerPeriodicRewardPointsSync(playerId) {
    return db.prepare(`
    SELECT id, point
    FROM players_periodic_reward_points
    WHERE player_id = ?
    `).all(playerId);
}
exports.getPlayerPeriodicRewardPointsSync = getPlayerPeriodicRewardPointsSync;
/**
 * Inserts a singular periodic reward point into a player's data.
 *
 * @param playerId The ID of the player.
 * @param periodicReward The periodic reward point data to insert.
 */
function insertPlayerPeriodicRewardPointsSync(playerId, periodicReward) {
    db.prepare(`
    INSERT INTO players_periodic_reward_points (id, point, player_id)
    VALUES (?, ?, ?)
    `).run(periodicReward.id, periodicReward.point, playerId);
}
/**
 * Batch inserts a =list of periodic reward points into a player's data.
 *
 * @param playerId The ID of the player.
 * @param periodicRewards A list of periodic reward points data to insert.
 */
function insertPlayerPeriodicRewardPointsListSync(playerId, periodicRewards) {
    db.transaction(() => {
        for (const periodicReward of periodicRewards) {
            insertPlayerPeriodicRewardPointsSync(playerId, periodicReward);
        }
    })();
}
/**
 * Retrieves the missions that a player is currently completing.
 *
 * @param playerId The ID of the player.
 * @returns A record of each mission and its current progress.
 */
function getPlayerActiveMissionsSync(playerId) {
    const rawMissions = db.prepare(`
    SELECT id, progress
    FROM players_active_missions
    WHERE player_id = ?
    `).all(playerId);
    const rawStages = db.prepare(`
    SELECT id, status, mission_id
    FROM players_active_missions_stages
    WHERE player_id = ?
    `).all(playerId);
    const stageBuckets = {};
    for (const rawStage of rawStages) {
        const missionId = rawStage.mission_id.toString();
        let bucket = stageBuckets[missionId];
        if (!bucket) {
            bucket = {};
            stageBuckets[missionId] = bucket;
        }
        bucket[rawStage.id] = (0, utils_2.deserializeBoolean)(rawStage.status);
    }
    const final = {};
    for (const rawMission of rawMissions) {
        const id = rawMission.id.toString();
        final[id] = {
            progress: rawMission.progress,
            stages: stageBuckets[id] || []
        };
    }
    return final;
}
exports.getPlayerActiveMissionsSync = getPlayerActiveMissionsSync;
/**
 * Inserts the data for a singular active mission stage into the database.
 *
 * @param playerId The player's ID.
 * @param stageId The ID of the stage.
 * @param missionId The ID of the mission that this stage belongs to.
 * @param status The status of the stage.
 */
function insertPlayerActiveMissionStageSync(playerId, stageId, missionId, status) {
    db.prepare(`
    INSERT INTO players_active_missions_stages (id, status, player_id, mission_id)
    VALUES (?, ?, ?, ?)   
    `).run(Number(stageId), (0, utils_2.serializeBoolean)(status), playerId, Number(missionId));
}
/**
 * Inserts a singular active mission into the database.
 *
 * @param playerId The player's iD>
 * @param missionId The ID of the mission to insert.
 * @param mission The mission's data.
 */
function insertPlayerActiveMissionSync(playerId, missionId, mission) {
    db.prepare(`
    INSERT INTO players_active_missions (id, progress, player_id)
    VALUES (?, ?, ?)
    `).run(Number(missionId), mission.progress, playerId);
    const stages = mission.stages;
    if (stages) {
        for (const [stageId, stage] of Object.entries(stages)) {
            insertPlayerActiveMissionStageSync(playerId, stageId, missionId, stage);
        }
    }
}
/**
 * Batch inserts a record of active missions into the database.
 *
 * @param playerId The player's ID.
 * @param missions The record of active missions to insert.
 */
function insertPlayerActiveMissionsSync(playerId, missions) {
    db.transaction(() => {
        for (const [missionId, mission] of Object.entries(missions)) {
            insertPlayerActiveMissionSync(playerId, missionId, mission);
        }
    })();
}
/**
 * Converts a RawPlayerBoxGacha object into a PlayerBoxGacha object.
 *
 * @param raw The raw object to convert.
 * @returns The converted object.
 */
function buildPlayerBoxGacha(raw) {
    return {
        boxId: raw.box_id,
        resetTimes: raw.reset_times,
        remainingNumber: raw.remaining_number,
        isClosed: (0, utils_2.deserializeBoolean)(raw.is_closed)
    };
}
/**
 * Gets the data for an individual player box gacha.
 *
 * @param playerId The ID of the player.
 * @param gachaId The ID of the box gacha.
 * @param boxId The ID of the box.
 * @returns A PlayerBoxGacha object or null.
 */
function getPlayerBoxGachaSync(playerId, gachaId, boxId) {
    const rawBox = db.prepare(`
    SELECT id, box_id, reset_times, remaining_number, is_closed
    FROM players_box_gacha
    WHERE player_id = ? AND id = ? AND box_id = ?
    `).get(playerId, gachaId, boxId);
    if (rawBox === undefined)
        return null;
    return buildPlayerBoxGacha(rawBox);
}
exports.getPlayerBoxGachaSync = getPlayerBoxGachaSync;
/**
 * Gets a player's box gachas.
 *
 * @param playerId The ID of the player
 * @returns A record containing the status of the player's box gachas.
 */
function getPlayerBoxGachasSync(playerId) {
    const rawBoxes = db.prepare(`
    SELECT id, box_id, reset_times, remaining_number, is_closed
    FROM players_box_gacha
    WHERE player_id = ?
    `).all(playerId);
    const buckets = {};
    for (const rawBox of rawBoxes) {
        const id = rawBox.id.toString();
        let bucket = buckets[id];
        if (!bucket) {
            bucket = [];
            buckets[id] = bucket;
        }
        bucket.push(buildPlayerBoxGacha(rawBox));
    }
    return buckets;
}
exports.getPlayerBoxGachasSync = getPlayerBoxGachasSync;
/**
 * Inserts a singular box gacha into a player's data.
 *
 * @param playerId The ID of the player.
 * @param gachaId
 * @param boxGacha The box gacha's data.
 */
function insertPlayerBoxGachaSync(playerId, gachaId, boxGacha) {
    db.prepare(`
    INSERT INTO players_box_gacha (id, box_id, reset_times, remaining_number, is_closed, player_id)
    VALUES (?, ?, ?, ?, ?, ?)
    `).run(Number(gachaId), boxGacha.boxId, boxGacha.resetTimes, boxGacha.remainingNumber, (0, utils_2.serializeBoolean)(boxGacha.isClosed), playerId);
}
exports.insertPlayerBoxGachaSync = insertPlayerBoxGachaSync;
/**
 * Batch inserts a record of box gachas into a player's data.
 *
 * @param playerId The ID of the player.
 * @param boxGachas The record of box gachas.
 */
function insertPlayerBoxGachasSync(playerId, boxGachas) {
    db.transaction(() => {
        for (const [section, list] of Object.entries(boxGachas)) {
            for (const boxGacha of list) {
                insertPlayerBoxGachaSync(playerId, section, boxGacha);
            }
        }
    })();
}
/**
 * Updates a player's box gacha box.
 *
 * @param playerId The ID of the player.
 * @param gachaId The ID of the box gacha that this box belongs to.
 * @param boxGacha
 *
 */
function updatePlayerBoxGachaSync(playerId, gachaId, boxGacha) {
    const fieldMap = {
        'resetTimes': 'reset_times',
        'remainingNumber': 'remaining_number',
        'isClosed': 'is_closed'
    };
    const sets = [];
    const values = [];
    for (const key in boxGacha) {
        const value = boxGacha[key];
        const mapped = fieldMap[key];
        if (mapped && value !== undefined) {
            sets.push(`${mapped} = ?`);
            if (typeof (value) === "boolean") {
                values.push((0, utils_2.serializeBoolean)(value));
            }
            else {
                values.push(value);
            }
        }
    }
    if (sets.length > 0)
        db.prepare(`
        UPDATE players_box_gacha
        SET ${sets.join(', ')}
        WHERE player_id = ? AND id = ? AND box_id = ?
        `).run([
            ...values,
            playerId,
            Number(gachaId),
            boxGacha.boxId
        ]);
}
exports.updatePlayerBoxGachaSync = updatePlayerBoxGachaSync;
/**
 * Gets all of the drawn rewards for a specific box gacha & box for a player.
 *
 * @param playerId The ID of the player.
 * @param gachaId The id of the box gacha.
 * @param boxId The box's ID.
 * @returns A list of drawn rewards.
 */
function getPlayerBoxGachaDrawnRewardsSync(playerId, gachaId, boxId) {
    return db.prepare(`
    SELECT id, number
    FROM players_box_gacha_drawn_rewards
    WHERE box_id = ? AND gacha_id = ? AND player_id = ?
    `).all(Number(boxId), gachaId, playerId);
}
exports.getPlayerBoxGachaDrawnRewardsSync = getPlayerBoxGachaDrawnRewardsSync;
/**
 * Inserts a drawn reward for a box gacha.
 *
 * @param playerId The ID of the player.
 * @param gachaId The id of the box gacha.
 * @param boxId The box's ID.
 * @param reward The reward to insert.
 */
function insertPlayerBoxGachaDrawnRewardSync(playerId, gachaId, boxId, reward) {
    db.prepare(`
    INSERT INTO players_box_gacha_drawn_rewards (id, box_id, gacha_id, number, player_id)
    VALUES (?, ?, ?, ?, ?)
    `).run(reward.id, Number(boxId), gachaId, reward.number, playerId);
}
exports.insertPlayerBoxGachaDrawnRewardSync = insertPlayerBoxGachaDrawnRewardSync;
/**
 * Updates a drawn reward for a box gacha.
 *
 * @param playerId The ID of the player.
 * @param gachaId The id of the box gacha.
 * @param boxId The box's ID.
 * @param rewardId A list of drawn rewards.
 * @param newNumber The new number value the drawn reward should have.
 */
function updatePlayerBoxGachaDrawnRewardSync(playerId, gachaId, boxId, rewardId, newNumber) {
    db.prepare(`
    UPDATE players_box_gacha_drawn_rewards
    SET number = ?
    WHERE player_id = ? AND gacha_id = ? AND box_id = ? AND id = ?
    `).run(newNumber, playerId, gachaId, Number(boxId), Number(rewardId));
}
exports.updatePlayerBoxGachaDrawnRewardSync = updatePlayerBoxGachaDrawnRewardSync;
/**
 * Gets the progress of a player's start dash exchange campaigns.
 *
 * @param playerId The player's ID.
 * @returns The status of the player's start dash exchange campaigns.
 */
function getPlayerStartDashExchangeCampaignsSync(playerId) {
    const rawCampaigns = db.prepare(`
    SELECT campaign_id, gacha_id, term_index, status, period_start_time, period_end_time
    FROM players_start_dash_exchange_campaigns
    WHERE player_id = ?
    `).all(playerId);
    return rawCampaigns.map(raw => {
        return {
            campaignId: raw.campaign_id,
            gachaId: raw.gacha_id,
            termIndex: raw.term_index,
            status: raw.status,
            periodStartTime: new Date(raw.period_start_time),
            periodEndTime: new Date(raw.period_end_time)
        };
    });
}
exports.getPlayerStartDashExchangeCampaignsSync = getPlayerStartDashExchangeCampaignsSync;
/**
 * Inserts a singular player start dash exchange campaign into the database.
 *
 * @param playerId The player's ID.
 * @param campaign The campaign's data.
 */
function insertPlayerStartDashExchangeCampaignSync(playerId, campaign) {
    db.prepare(`
    INSERT INTO players_start_dash_exchange_campaigns (campaign_id, gacha_id, term_index, status, period_start_time, period_end_time, player_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(campaign.campaignId, campaign.gachaId, campaign.termIndex, campaign.status, campaign.periodStartTime.toISOString(), campaign.periodEndTime.toISOString(), playerId);
}
/**
 * Batch inserts a list of start dash exchange campaigns into a player's data.
 *
 * @param playerId The ID of the player.
 * @param campaigns The list of campaigns to insert.
 */
function insertPlayerStartDashExchangeCampaignsSync(playerId, campaigns) {
    db.transaction(() => {
        for (const campaign of campaigns) {
            insertPlayerStartDashExchangeCampaignSync(playerId, campaign);
        }
    })();
}
/**
 * Gets the progress of a player's multi special exchange campaigns.
 *
 * @param playerId The player's ID.
 * @returns The status of the player's multi special exchange campaigns.
 */
function getPlayerMultiSpecialExchangeCampaignsSync(playerId) {
    const rawCampaigns = db.prepare(`
    SELECT campaign_id, status
    FROM players_multi_special_exchange_campaigns
    WHERE player_id = ?
    `).all(playerId);
    return rawCampaigns.map(raw => {
        return {
            campaignId: raw.campaign_id,
            status: raw.status
        };
    });
}
exports.getPlayerMultiSpecialExchangeCampaignsSync = getPlayerMultiSpecialExchangeCampaignsSync;
/**
 * Inserts a singular multi special exchange campaign into the database.
 *
 * @param playerId The player's ID.
 * @param campaign The campaign's data.
 */
function insertPlayerMultiSpecialExchangeCampaignSync(playerId, campaign) {
    db.prepare(`
    INSERT INTO players_multi_special_exchange_campaigns (campaign_id, status, player_id)
    VALUES (?, ?, ?)
    `).run(campaign.campaignId, campaign.status, playerId);
}
/**
 * Batch inserts a list of multi special exchange campaigns into a player's data.
 *
 * @param playerId The ID of the player.
 * @param campaigns The list of campaigns to insert.
 */
function insertPlayerMultiSpecialExchangeCampaignsSync(playerId, campaigns) {
    db.transaction(() => {
        for (const campaign of campaigns) {
            insertPlayerMultiSpecialExchangeCampaignSync(playerId, campaign);
        }
    })();
}
/**
 * Deserializes a RawPlayerRushEvent into a PlayerRushEvent
 *
 * @param raw
 * @param endlessBattleNextRound The next endless battle round for this event.
 */
function deserializeRushEvent(raw, endlessBattleNextRound) {
    return {
        eventId: raw.event_id,
        endlessBattleNextRound: endlessBattleNextRound,
        activeRushBattleFolderId: raw.active_rush_battle_folder_id,
        endlessBattleMaxRound: raw.endless_battle_max_round,
        endlessBattleMaxRoundTime: raw.endless_battle_max_round_time,
        endlessBattleMaxRoundCharacterIds: [
            raw.endless_battle_max_round_character_id_1,
            raw.endless_battle_max_round_character_id_2,
            raw.endless_battle_max_round_character_id_3
        ],
        endlessBattleMaxRoundCharacterEvolutionImgLvls: [
            raw.endless_battle_max_round_character_evolution_img_lvl_1,
            raw.endless_battle_max_round_character_evolution_img_lvl_2,
            raw.endless_battle_max_round_character_evolution_img_lvl_3,
        ]
    };
}
exports.deserializeRushEvent = deserializeRushEvent;
/**
 * Returns a default PlayerRushEvent.
 *
 * @param eventId The ID of the event to get the default PlayerRushEvent of.
 * @returns A default PlayerRushEvent
 */
function getDefaultPlayerRushEventSync(eventId) {
    return {
        eventId: eventId,
        endlessBattleNextRound: 1,
        activeRushBattleFolderId: null,
        endlessBattleMaxRound: null,
        endlessBattleMaxRoundTime: null,
        endlessBattleMaxRoundCharacterIds: [null, null, null],
        endlessBattleMaxRoundCharacterEvolutionImgLvls: [null, null, null]
    };
}
exports.getDefaultPlayerRushEventSync = getDefaultPlayerRushEventSync;
/**
 * Gets the data for a player's rush event progress.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @returns The rush event data or null.
 */
function getPlayerRushEventSync(playerId, eventId) {
    const rawData = db.prepare(`
    SELECT *
    FROM players_rush_events
    WHERE player_id = ? AND event_id = ?
    `).get(playerId, eventId);
    // get next endless round
    const nextEndlessBattleRound = getPlayerRushEventNextEndlessBattleRoundSync(playerId, eventId);
    return rawData === undefined ? null : deserializeRushEvent(rawData, nextEndlessBattleRound);
}
exports.getPlayerRushEventSync = getPlayerRushEventSync;
/**
 * Batch gets the data for every rush event a player has participated in.
 *
 * @param playerId The ID of the player.
 * @returns An array of PlayerRushEvent objects.
 */
function getPlayerRushEventListSync(playerId) {
    const rawData = db.prepare(`
    SELECT *
    FROM players_rush_events
    WHERE player_id = ?
    `).all(playerId);
    return rawData.map(raw => deserializeRushEvent(raw, 1));
}
exports.getPlayerRushEventListSync = getPlayerRushEventListSync;
/**
 * Gets rush event endless battle rankings for a specific rush event.
 *
 * @param eventId The rush event's ID.
 * @param page The current page.
 * @param pageSize The size of each page.
 * @returns The ranking list result.
 */
function getRushEventEndlessRankingListSync(eventId, page, pageSize = 100) {
    var _a, _b;
    const offset = page * pageSize;
    const results = db.prepare(`
    SELECT *,
        COUNT(*) OVER() as total_count
    FROM players_rush_events
    WHERE event_id = ?
    ORDER BY endless_battle_max_round DESC,
        endless_battle_max_round_time ASC
    LIMIT ?
    OFFSET ?
    `).all(eventId, pageSize, offset);
    const totalCount = (_b = (_a = results[0]) === null || _a === void 0 ? void 0 : _a.total_count) !== null && _b !== void 0 ? _b : 0;
    const mappedResults = [];
    let rankNumber = 1;
    for (const raw of results) {
        const ranking = (0, rush_1.getPlayerRushEventEndlessBattleRankingSync)(raw.player_id, eventId, {
            rankNumber: rankNumber + offset
        });
        if (ranking !== null) {
            mappedResults.push(ranking);
            rankNumber += 1;
        }
    }
    return {
        pageMax: Math.ceil(totalCount / pageSize),
        list: mappedResults
    };
}
exports.getRushEventEndlessRankingListSync = getRushEventEndlessRankingListSync;
/**
 * Gets the player ID who is at a specific rank for the endless battle leaderboard for a raid event.
 *
 * @param rank The rank to get the player ID of.
 * @param eventId The ID of the rush event.
 * @returns A player ID or null.
 */
function getPlayerIdFromRushEventEndlessRankSync(rank, eventId) {
    var _a;
    const result = db.prepare(`
    SELECT player_id
    FROM players_rush_events
    WHERE event_id = ?
    ORDER BY endless_battle_max_round DESC,
        endless_battle_max_round_time ASC
    LIMIT 1
    OFFSET ?
    `).get(eventId, rank - 1);
    return (_a = result === null || result === void 0 ? void 0 : result.player_id) !== null && _a !== void 0 ? _a : null;
}
exports.getPlayerIdFromRushEventEndlessRankSync = getPlayerIdFromRushEventEndlessRankSync;
/**
 * Inserts the data for a player's rush event progress.
 *
 * @param playerId The ID of the player.
 * @param rushEvent The data of the rush event to insert.
 */
function insertPlayerRushEventSync(playerId, rushEvent) {
    db.prepare(`
    INSERT INTO players_rush_events
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(playerId, rushEvent.eventId, rushEvent.activeRushBattleFolderId, rushEvent.endlessBattleMaxRound, rushEvent.endlessBattleMaxRoundTime, ...rushEvent.endlessBattleMaxRoundCharacterIds, ...rushEvent.endlessBattleMaxRoundCharacterEvolutionImgLvls);
}
exports.insertPlayerRushEventSync = insertPlayerRushEventSync;
/**
 * Batch inserts a player's data for multiple rush events into the database.
 *
 * @param playerId The ID of the player.
 * @param eventList An array of rush event data entries.
 */
function insertPlayerRushEventListSync(playerId, eventList) {
    db.transaction(() => {
        for (const event of eventList) {
            insertPlayerRushEventSync(playerId, event);
        }
    })();
}
exports.insertPlayerRushEventListSync = insertPlayerRushEventListSync;
/**
 * Updates the data for a player's rush event progress.
 *
 * @param playerId The ID of the player.
 * @param rushEvent The values to change.
 */
function updatePlayerRushEventSync(playerId, rushEvent) {
    const characterIds = rushEvent.endlessBattleMaxRoundCharacterIds;
    const characterEvolutionImgLevels = rushEvent.endlessBattleMaxRoundCharacterEvolutionImgLvls;
    const fields = {
        'active_rush_battle_folder_id': rushEvent.activeRushBattleFolderId,
        'endless_battle_max_round': rushEvent.endlessBattleMaxRound,
        'endless_battle_max_round_time': rushEvent.endlessBattleMaxRoundTime,
        'endless_battle_max_round_character_id_1': characterIds === null || characterIds === void 0 ? void 0 : characterIds[0],
        'endless_battle_max_round_character_id_2': characterIds === null || characterIds === void 0 ? void 0 : characterIds[1],
        'endless_battle_max_round_character_id_3': characterIds === null || characterIds === void 0 ? void 0 : characterIds[2],
        'endless_battle_max_round_character_evolution_img_lvl_1': characterEvolutionImgLevels === null || characterEvolutionImgLevels === void 0 ? void 0 : characterEvolutionImgLevels[0],
        'endless_battle_max_round_character_evolution_img_lvl_2': characterEvolutionImgLevels === null || characterEvolutionImgLevels === void 0 ? void 0 : characterEvolutionImgLevels[1],
        'endless_battle_max_round_character_evolution_img_lvl_3': characterEvolutionImgLevels === null || characterEvolutionImgLevels === void 0 ? void 0 : characterEvolutionImgLevels[2],
    };
    const sets = [];
    const values = [];
    for (const [field, value] of Object.entries(fields)) {
        if (value !== undefined) {
            sets.push(`${field} = ?`);
            values.push(value);
        }
    }
    if (sets.length > 0)
        db.prepare(`
        UPDATE players_rush_events
        SET ${sets.join(', ')}
        WHERE player_id = ? AND event_id = ?
        `).run([
            ...values,
            playerId,
            rushEvent.eventId
        ]);
}
exports.updatePlayerRushEventSync = updatePlayerRushEventSync;
/**
 * Gets all of the folders that a player has cleared for a specific rush event.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @returns An array of cleared folder IDs.
 */
function getPlayerRushEventClearedFoldersSync(playerId, eventId) {
    const rawCleared = db.prepare(`
    SELECT player_id, event_id, folder_id
    FROM players_rush_events_cleared_folders
    WHERE player_id = ? AND event_id = ?
    `).all(playerId, eventId);
    return rawCleared.map(raw => raw.folder_id);
}
exports.getPlayerRushEventClearedFoldersSync = getPlayerRushEventClearedFoldersSync;
/**
 * Gets all of the cleared folders for every rush event.
 *
 * @param playerId The ID of the player.
 * @returns A record where the key is the event ID and the value is an array of cleared folder IDs.
 */
function getPlayerRushEventListClearedFoldersSync(playerId) {
    const rawCleared = db.prepare(`
    SELECT player_id, event_id, folder_id
    FROM players_rush_events_cleared_folders
    WHERE player_id = ?
    `).all(playerId);
    const eventFolderBuckets = {};
    for (const clearedFolder of rawCleared) {
        let bucket = eventFolderBuckets[clearedFolder.event_id];
        if (bucket === undefined) {
            bucket = [];
            eventFolderBuckets[clearedFolder.event_id] = bucket;
        }
        bucket.push(clearedFolder.folder_id);
    }
    return eventFolderBuckets;
}
exports.getPlayerRushEventListClearedFoldersSync = getPlayerRushEventListClearedFoldersSync;
/**
 * Marks a rush event's folder as cleared for a specific player.
 *
 * @param playerId The ID of the player
 * @param eventId The ID of the rush event.
 * @param folderId The ID of the cleared folder.
 */
function insertPlayerRushEventClearedFolderSync(playerId, eventId, folderId) {
    db.prepare(`
    INSERT OR IGNORE INTO players_rush_events_cleared_folders (player_id, event_id, folder_id)
    VALUES (?, ?, ?)
    `).run(playerId, eventId, folderId);
}
exports.insertPlayerRushEventClearedFolderSync = insertPlayerRushEventClearedFolderSync;
/**
 * Batch inserts multiple cleared folder IDs into the database.
 *
 * @param playerId The ID of the player.
 * @param folderList A record where the key is the ID of a rush event and the value is an array of folder IDs.
 */
function insertPlayerRushEventClearedFolderListSync(playerId, folderList) {
    db.transaction(() => {
        for (const [rawEventId, folders] of Object.entries(folderList)) {
            const eventId = Number(rawEventId);
            for (const folderId of folders) {
                insertPlayerRushEventClearedFolderSync(playerId, eventId, folderId);
            }
        }
    })();
}
exports.insertPlayerRushEventClearedFolderListSync = insertPlayerRushEventClearedFolderListSync;
/**
 * Converts a PlayerRushEventPlayedParty object from database format.
 *
 * @param serialized The PlayerRushEventPlayedParty in database format.
 * @returns
 */
function deserializePlayerRushEventPlayedParty(serialized) {
    return {
        characterIds: [
            serialized.character_id_1,
            serialized.character_id_2,
            serialized.character_id_3
        ],
        unisonCharacterIds: [
            serialized.unison_character_id_1,
            serialized.unison_character_id_2,
            serialized.unison_character_id_3
        ],
        abilitySoulIds: [
            serialized.ability_soul_id_1,
            serialized.ability_soul_id_2,
            serialized.ability_soul_id_3
        ],
        equipmentIds: [
            serialized.equipment_id_1,
            serialized.equipment_id_2,
            serialized.equipment_id_3
        ],
        evolutionImgLevels: [
            serialized.evolution_img_level_1,
            serialized.evolution_img_level_2,
            serialized.evolution_img_level_3
        ],
        unisonEvolutionImgLevels: [
            serialized.unison_evolution_img_level_1,
            serialized.unison_evolution_img_level_2,
            serialized.unison_evolution_img_level_3
        ],
        battleType: serialized.battle_type,
        round: serialized.round
    };
}
exports.deserializePlayerRushEventPlayedParty = deserializePlayerRushEventPlayedParty;
/**
 * Converts a PlayerRushEventPlayedParty into database format.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @param deserialized The deserialized rush party to convert.
 * @returns A RawPlayerRushEventPlayedParty
 */
function serializePlayerRushEventPlayedParty(deserialized) {
    return {
        character_id_1: deserialized.characterIds[0],
        character_id_2: deserialized.characterIds[1],
        character_id_3: deserialized.characterIds[2],
        unison_character_id_1: deserialized.unisonCharacterIds[0],
        unison_character_id_2: deserialized.unisonCharacterIds[1],
        unison_character_id_3: deserialized.unisonCharacterIds[2],
        equipment_id_1: deserialized.equipmentIds[0],
        equipment_id_2: deserialized.equipmentIds[1],
        equipment_id_3: deserialized.equipmentIds[2],
        ability_soul_id_1: deserialized.abilitySoulIds[0],
        ability_soul_id_2: deserialized.abilitySoulIds[1],
        ability_soul_id_3: deserialized.abilitySoulIds[2],
        evolution_img_level_1: deserialized.evolutionImgLevels[0],
        evolution_img_level_2: deserialized.evolutionImgLevels[1],
        evolution_img_level_3: deserialized.evolutionImgLevels[2],
        unison_evolution_img_level_1: deserialized.unisonEvolutionImgLevels[0],
        unison_evolution_img_level_2: deserialized.unisonEvolutionImgLevels[1],
        unison_evolution_img_level_3: deserialized.unisonEvolutionImgLevels[2],
    };
}
exports.serializePlayerRushEventPlayedParty = serializePlayerRushEventPlayedParty;
/**
 * Gets an array of all of a player's parties that they have used to clear rush events.
 *
 * @param playerId The ID of the player.
 * @param eventId The event ID
 * @returns
 */
function getPlayerRushEventPlayedPartiesSync(playerId, eventId) {
    const rawParties = db.prepare(`
    SELECT character_id_1, character_id_2, character_id_3,
        unison_character_id_1, unison_character_id_2, unison_character_id_3,
        equipment_id_1, equipment_id_2, equipment_id_3, ability_soul_id_1,
        ability_soul_id_2, ability_soul_id_3, evolution_img_level_1,
        evolution_img_level_2, evolution_img_level_3,
        unison_evolution_img_level_1, unison_evolution_img_level_2,
        unison_evolution_img_level_3, player_id, event_id, round,
        battle_type
    FROM players_rush_events_played_parties
    WHERE player_id = ? AND event_id = ?
    `).all(playerId, eventId);
    return rawParties.map(raw => deserializePlayerRushEventPlayedParty(raw));
}
exports.getPlayerRushEventPlayedPartiesSync = getPlayerRushEventPlayedPartiesSync;
/**
 * Batch gets a list of every played party for every rush event for a specific player.
 *
 * @param playerId The ID of the player.
 * @returns A record where the key is an EventID and the value is an array of PlayerRushEventPlayedParty.
 */
function getPlayerRushEventListPlayedPartiesSync(playerId) {
    const rawParties = db.prepare(`
    SELECT *
    FROM players_rush_events_played_parties
    WHERE player_id = ?
    `).all(playerId);
    const eventPartyBuckets = {};
    for (const rawParty of rawParties) {
        let bucket = eventPartyBuckets[rawParty.event_id];
        if (bucket === undefined) {
            bucket = [];
            eventPartyBuckets[rawParty.event_id] = bucket;
        }
        bucket.push(deserializePlayerRushEventPlayedParty(rawParty));
    }
    return eventPartyBuckets;
}
exports.getPlayerRushEventListPlayedPartiesSync = getPlayerRushEventListPlayedPartiesSync;
/**
 * Gets the next endless battle round that a player should complete for a specific rush event.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @returns The next round that the player should complete.
 */
function getPlayerRushEventNextEndlessBattleRoundSync(playerId, eventId) {
    const rawRounds = db.prepare(`
    SELECT round
    FROM players_rush_events_played_parties
    WHERE player_id = ? AND event_id = ? AND battle_type = ?
    `).all(playerId, eventId, types_1.RushEventBattleType.ENDLESS);
    let nextRound = 1;
    for (const rawRound of rawRounds) {
        if (rawRound.round !== nextRound)
            break;
        nextRound += 1;
    }
    return nextRound;
}
exports.getPlayerRushEventNextEndlessBattleRoundSync = getPlayerRushEventNextEndlessBattleRoundSync;
/**
 * Inserts a rush event played party for a specific player.
 *
 * @param playerId The ID of the player.
 * @param eventId The rush event's ID.
 * @param party The party data.
 */
function insertPlayerRushEventPlayedPartySync(playerId, eventId, party) {
    db.prepare(`
    INSERT INTO players_rush_events_played_parties
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(party.characterIds[0], party.characterIds[1], party.characterIds[2], party.unisonCharacterIds[0], party.unisonCharacterIds[1], party.unisonCharacterIds[2], party.equipmentIds[0], party.equipmentIds[1], party.equipmentIds[2], party.abilitySoulIds[0], party.abilitySoulIds[1], party.abilitySoulIds[2], party.evolutionImgLevels[0], party.evolutionImgLevels[1], party.evolutionImgLevels[2], party.unisonEvolutionImgLevels[0], party.unisonEvolutionImgLevels[1], party.unisonEvolutionImgLevels[2], playerId, eventId, party.round, party.battleType);
}
exports.insertPlayerRushEventPlayedPartySync = insertPlayerRushEventPlayedPartySync;
/**
 * Batch inserts PlayerRushEventPlayedParty values into the database.
 *
 * @param playerId The ID of the player.
 * @param partyList A record where the key is an event ID, and the value is an array of rush event played parties.
 */
function insertPlayerRushEventPlayedPartyListSync(playerId, partyList) {
    db.transaction(() => {
        for (const [rawEventId, parties] of Object.entries(partyList)) {
            const eventId = Number(rawEventId);
            for (const party of parties) {
                insertPlayerRushEventPlayedPartySync(playerId, eventId, party);
            }
        }
    })();
}
exports.insertPlayerRushEventPlayedPartyListSync = insertPlayerRushEventPlayedPartyListSync;
/**
 * Deletes all of a player's rush event played parties for a specific event & battle type.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @param battleType The type of rush event battle.
 */
function deletePlayerRushEventPlayedPartyListSync(playerId, eventId, battleType) {
    db.prepare(`
    DELETE FROM players_rush_events_played_parties
    WHERE player_id = ? AND event_id = ? AND battle_type = ?
    `).run(playerId, eventId, battleType);
}
exports.deletePlayerRushEventPlayedPartyListSync = deletePlayerRushEventPlayedPartyListSync;
/**
 * Deletes a single rush event played party for a specific player & rush event.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @param round The round to delete.
 * @param battleType The type of rush event battle.
 */
function deletePlayerRushEventPlayedPartySync(playerId, eventId, round, battleType) {
    db.prepare(`
    DELETE FROM players_rush_events_played_parties
    WHERE player_id = ? AND event_id = ? AND round = ? AND battle_type = ?
    `).run(playerId, eventId, round, battleType);
}
exports.deletePlayerRushEventPlayedPartySync = deletePlayerRushEventPlayedPartySync;
/**
 * Deletes a player's rush event played parties while their round number is greater than or equal to the provided value.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @param battleType The type of rush event battle.
 * @param untilRound Delete parties until this round.
 */
function deletePlayerRushEventPlayedPartiesUntilSync(playerId, eventId, battleType, untilRound) {
    db.prepare(`
    DELETE FROM players_rush_events_played_parties
    WHERE player_id = ? AND event_id = ? AND battle_type = ?
        AND round >= ?
    `).run(playerId, eventId, battleType, untilRound);
}
exports.deletePlayerRushEventPlayedPartiesUntilSync = deletePlayerRushEventPlayedPartiesUntilSync;
/**
 * Updates an existing rush event played party for a specific player & rush event.
 *
 * @param playerId The player's ID.
 * @param eventId The ID of the rush event.
 * @param party The new party data.
 */
function updatePlayerRushEventPlayedPartySync(playerId, eventId, party) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    db.prepare(`
    UPDATE players_rush_events_played_parties
    SET character_id_1 = ?,
        character_id_2 = ?,
        character_id_3 = ?,
        unison_character_id_1 = ?,
        unison_character_id_2 = ?,
        unison_character_id_3 = ?,
        equipment_id_1 = ?,
        equipment_id_2 = ?,
        equipment_id_3 = ?,
        ability_soul_id_1 = ?,
        ability_soul_id_2 = ?,
        ability_soul_id_3 = ?,
        evolution_img_level_1 = ?,
        evolution_img_level_2 = ?,
        evolution_img_level_3 = ?,
        unison_evolution_img_level_1 = ?,
        unison_evolution_img_level_2 = ?,
        unison_evolution_img_level_3 = ?,
    WHERE player_id = ? AND event_id = ? AND round = ? AND battle_type = ?
    `).run((_a = party.characterIds[0]) !== null && _a !== void 0 ? _a : null, (_b = party.characterIds[1]) !== null && _b !== void 0 ? _b : null, (_c = party.characterIds[2]) !== null && _c !== void 0 ? _c : null, (_d = party.unisonCharacterIds[0]) !== null && _d !== void 0 ? _d : null, (_e = party.unisonCharacterIds[1]) !== null && _e !== void 0 ? _e : null, (_f = party.unisonCharacterIds[2]) !== null && _f !== void 0 ? _f : null, (_g = party.equipmentIds[0]) !== null && _g !== void 0 ? _g : null, (_h = party.equipmentIds[1]) !== null && _h !== void 0 ? _h : null, (_j = party.equipmentIds[2]) !== null && _j !== void 0 ? _j : null, (_k = party.abilitySoulIds[0]) !== null && _k !== void 0 ? _k : null, (_l = party.abilitySoulIds[1]) !== null && _l !== void 0 ? _l : null, (_m = party.abilitySoulIds[2]) !== null && _m !== void 0 ? _m : null, (_o = party.evolutionImgLevels[0]) !== null && _o !== void 0 ? _o : null, (_p = party.evolutionImgLevels[1]) !== null && _p !== void 0 ? _p : null, (_q = party.evolutionImgLevels[2]) !== null && _q !== void 0 ? _q : null, (_r = party.unisonEvolutionImgLevels[0]) !== null && _r !== void 0 ? _r : null, (_s = party.unisonEvolutionImgLevels[1]) !== null && _s !== void 0 ? _s : null, (_t = party.unisonEvolutionImgLevels[2]) !== null && _t !== void 0 ? _t : null, playerId, eventId, party.round, party.battleType);
}
exports.updatePlayerRushEventPlayedPartySync = updatePlayerRushEventPlayedPartySync;
/**
 * Inserts a player option into the database.
 *
 * @param playerId The ID of the player.
 * @param key The key of the option.
 * @param value The value of the option
 */
function insertPlayerOptionSync(playerId, key, value) {
    db.prepare(`
    INSERT INTO players_options (key, value, player_id)
    VALUES (?, ?, ?)
    `).run(key, (0, utils_2.serializeBoolean)(value), playerId);
}
exports.insertPlayerOptionSync = insertPlayerOptionSync;
/**
 * Batch inserts a record of options into the database.
 *
 * @param playerId The ID of the player that these options belong to.
 * @param options The record of options to insert.
 */
function insertPlayerOptionsSync(playerId, options) {
    db.transaction(() => {
        for (const [key, value] of Object.entries(options)) {
            insertPlayerOptionSync(playerId, key, value);
        }
    })();
}
exports.insertPlayerOptionsSync = insertPlayerOptionsSync;
/**
 * Gets all of the options that a player has saved.
 *
 * @param playerId The ID of the player.
 * @returns A record of options.
 */
function getPlayerOptionsSync(playerId) {
    const rawOptions = db.prepare(`
    SELECT key, value
    FROM players_options
    WHERE player_id = ?
    `).all(playerId);
    const result = {};
    for (const rawOption of rawOptions) {
        result[rawOption.key] = (0, utils_2.deserializeBoolean)(rawOption.value);
    }
    return result;
}
exports.getPlayerOptionsSync = getPlayerOptionsSync;
/**
 * Updates the value of a player option.
 *
 * @param playerId The ID of the player to update the option of.
 * @param key The key of the option to update.
 * @param value The new value.
 */
function updatePlayerOptionSync(playerId, key, value) {
    db.prepare(`
    UPDATE players_options
    SET value = ?
    WHERE key = ? AND player_id = ?    
    `).run((0, utils_2.serializeBoolean)(value), key, playerId);
}
exports.updatePlayerOptionSync = updatePlayerOptionSync;
/**
 * Batch updates a player's options.
 *
 * @param playerId The ID of the player to update the options of.
 * @param options A record of options to update the values of.
 */
function updatePlayerOptionsSync(playerId, options) {
    // get all of a player's options
    const allOptions = getPlayerOptionsSync(playerId);
    db.transaction(() => {
        for (const [key, newValue] of Object.entries(options)) {
            const existingValue = allOptions[key];
            if (existingValue === undefined) {
                // insert the value since it doesn't exist.
                insertPlayerOptionSync(playerId, key, newValue);
            }
            else if (newValue !== existingValue) {
                // update the value since it's different than the existing value
                updatePlayerOptionSync(playerId, key, newValue);
            }
        }
    })();
}
exports.updatePlayerOptionsSync = updatePlayerOptionsSync;
function getPlayerFromAccountIdSync(accountId) {
    const response = db.prepare(`
    SELECT id
    FROM players
    WHERE account_id = ?
    `).get(accountId);
    if (response === undefined)
        return null;
    return getPlayerSync(response.id);
}
exports.getPlayerFromAccountIdSync = getPlayerFromAccountIdSync;
/**
 * Gets the account that is tied to an individual player.
 *
 * @param playerId The ID of the player.
 * @returns The account that is tied to the player.
 */
function getAccountFromPlayerIdSync(playerId) {
    const raw = db.prepare(`
    SELECT account_id
    FROM players
    WHERE id = ?
    `).get(playerId);
    return raw === undefined ? null : getAccountSync(raw.account_id);
}
exports.getAccountFromPlayerIdSync = getAccountFromPlayerIdSync;
/**
 * Converts a RawPlayer into a Player
 *
 * @param raw The raw player to convert into a player.
 * @returns The converted Player
 */
function buildPlayer(raw) {
    return {
        id: raw.id,
        stamina: raw.stamina,
        staminaHealTime: new Date(raw.stamina_heal_time),
        boostPoint: raw.boost_point,
        bossBoostPoint: raw.boss_boost_point,
        transitionState: raw.transition_state,
        role: raw.role,
        name: raw.name,
        lastLoginTime: new Date(raw.last_login_time),
        comment: raw.comment,
        vmoney: raw.vmoney,
        freeVmoney: raw.free_vmoney,
        rankPoint: raw.rank_point,
        starCrumb: raw.star_crumb,
        bondToken: raw.bond_token,
        expPool: raw.exp_pool,
        expPooledTime: new Date(raw.exp_pooled_time),
        leaderCharacterId: raw.leader_character_id,
        partySlot: raw.party_slot,
        degreeId: raw.degree_id,
        birth: raw.birth,
        freeMana: raw.free_mana,
        paidMana: raw.paid_mana,
        enableAuto3x: (0, utils_2.deserializeBoolean)(raw.enable_auto_3x),
        tutorialStep: raw.tutorial_step,
        tutorialSkipFlag: raw.tutorial_skip_flag === null ? null : (0, utils_2.deserializeBoolean)(raw.tutorial_skip_flag),
    };
}
function getPlayerSync(playerId) {
    const raw = db.prepare(`
    SELECT id, stamina, stamina_heal_time, boost_point, boss_boost_point,
        transition_state, role, name, last_login_time, comment,
        vmoney, free_vmoney, rank_point, star_crumb,
        bond_token, exp_pool, exp_pooled_time, leader_character_id, party_slot,
        degree_id, birth, free_mana, paid_mana, enable_auto_3x, tutorial_step, tutorial_skip_flag
    FROM players
    WHERE id = ?    
    `).get(playerId);
    if (raw === undefined)
        return null;
    return buildPlayer(raw);
}
exports.getPlayerSync = getPlayerSync;
function getAllPlayersSync(offset = 0, limit = 25) {
    const raw = db.prepare(`
    SELECT id, stamina, stamina_heal_time, boost_point, boss_boost_point,
        transition_state, role, name, last_login_time, comment,
        vmoney, free_vmoney, rank_point, star_crumb,
        bond_token, exp_pool, exp_pooled_time, leader_character_id, party_slot,
        degree_id, birth, free_mana, paid_mana, enable_auto_3x, tutorial_step, tutorial_skip_flag
    FROM players
    LIMIT ?
    OFFSET ?
    `).all(limit, offset);
    return raw.map(rawPlayer => buildPlayer(rawPlayer));
}
exports.getAllPlayersSync = getAllPlayersSync;
/**
 * Inserts a player into the database.
 *
 * @param accountId The ID of the account that this player is linked to.
 * @param player The player data to insert.
 * @returns The ID of the player that was inserted.
 */
function insertPlayerSync(accountId, player) {
    const playerId = player.id;
    const playerIdGiven = playerId !== undefined;
    const values = [
        player.stamina,
        player.staminaHealTime.toISOString(),
        player.boostPoint,
        player.bossBoostPoint,
        player.transitionState,
        player.role,
        player.name,
        player.lastLoginTime.toISOString(),
        player.comment,
        player.vmoney,
        player.freeVmoney,
        player.rankPoint,
        player.starCrumb,
        player.bondToken,
        player.expPool,
        player.expPooledTime.toISOString(),
        player.leaderCharacterId,
        player.partySlot,
        player.degreeId,
        player.birth,
        player.freeMana,
        player.paidMana,
        (0, utils_2.serializeBoolean)(player.enableAuto3x),
        accountId,
        player.tutorialStep === null ? null : player.tutorialStep,
        player.tutorialSkipFlag === null ? null : (0, utils_2.serializeBoolean)(player.tutorialSkipFlag)
    ];
    if (playerIdGiven)
        values.push(playerId);
    const insert = db.prepare(`
    INSERT INTO players (stamina, stamina_heal_time, boost_point, boss_boost_point,
        transition_state, role, name, last_login_time, comment, vmoney, free_vmoney,
        rank_point, star_crumb, bond_token, exp_pool, exp_pooled_time, leader_character_id,
        party_slot, degree_id, birth, free_mana, paid_mana, enable_auto_3x, account_id, 
        tutorial_step, tutorial_skip_flag${playerIdGiven ? ', id' : ''})
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${playerIdGiven ? ', ?' : ''})
    `).run(values);
    // return
    return Number(insert.lastInsertRowid);
}
exports.insertPlayerSync = insertPlayerSync;
/**
 * Inserts the data from a MergedPlayerData object into the database.
 *
 * @param toInsert The data to insert into the database.
 * @returns The newly inserted player's id.
 */
function insertMergedPlayerDataSync(accountId, toInsert) {
    const player = toInsert.player;
    const playerId = player.id;
    insertPlayerSync(accountId, player);
    insertPlayerDailyChallengePointListSync(playerId, toInsert.dailyChallengePointList);
    insertPlayerTriggeredTutorialsSync(playerId, toInsert.triggeredTutorial);
    insertPlayerClearedRegularMissionListSync(playerId, toInsert.clearedRegularMissionList);
    insertPlayerCharactersSync(playerId, toInsert.characterList);
    insertPlayerCharactersManaNodesSync(playerId, toInsert.characterManaNodeList);
    insertPlayerPartyGroupListSync(playerId, toInsert.partyGroupList);
    insertPlayerItemsSync(playerId, toInsert.itemList);
    insertPlayerEquipmentListSync(playerId, toInsert.equipmentList);
    insertPlayerQuestProgressListSync(playerId, toInsert.questProgress);
    insertPlayerGachaInfoListSync(playerId, toInsert.gachaInfoList);
    insertPlayerGachaCampaignListSync(playerId, toInsert.gachaCampaignList);
    insertPlayerDrawnQuestsSync(playerId, toInsert.drawnQuestList);
    insertPlayerPeriodicRewardPointsListSync(playerId, toInsert.periodicRewardPointList);
    insertPlayerActiveMissionsSync(playerId, toInsert.allActiveMissionList);
    insertPlayerBoxGachasSync(playerId, toInsert.boxGachaList);
    insertPlayerStartDashExchangeCampaignsSync(playerId, toInsert.startDashExchangeCampaignList);
    insertPlayerMultiSpecialExchangeCampaignsSync(playerId, toInsert.multiSpecialExchangeCampaignList);
    insertPlayerOptionsSync(playerId, toInsert.userOption);
    // insert data that could be undefined.
    const rushEventList = toInsert.rushEventList;
    if (rushEventList !== undefined) {
        insertPlayerRushEventListSync(playerId, rushEventList);
    }
    const rushEventClearedFolderList = toInsert.rushEventClearedFolderList;
    if (rushEventClearedFolderList !== undefined) {
        insertPlayerRushEventClearedFolderListSync(playerId, rushEventClearedFolderList);
    }
    const rushEventPlayedPartyList = toInsert.rushEventPlayedPartyList;
    if (rushEventPlayedPartyList !== undefined) {
        insertPlayerRushEventPlayedPartyListSync(playerId, rushEventPlayedPartyList);
    }
}
exports.insertMergedPlayerDataSync = insertMergedPlayerDataSync;
function getDefaultPlayerPartyGroupsSync(partyType = types_1.PartyCategory.NORMAL, characterIds = [1, null, null]) {
    const partyGroups = {};
    const partyNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    const groupCount = 6;
    let currentParty = 1;
    const character1 = characterIds[0];
    const character2 = characterIds[1];
    const character3 = characterIds[2];
    for (let i = 0; i < groupCount; i++) {
        const list = {};
        const group = {
            list: list,
            colorId: 15,
            category: partyType
        };
        for (const name of partyNames) {
            list[currentParty] = {
                name: `Party ${name}`,
                characterIds: [character1, character2, character3],
                unisonCharacterIds: [null, null, null],
                equipmentIds: [null, null, null],
                abilitySoulIds: [null, null, null],
                edited: false,
                options: {
                    allowOtherPlayersToHealMe: true
                },
                category: partyType
            };
            currentParty += 1;
        }
        partyGroups[(i + 1).toString()] = group;
    }
    return partyGroups;
}
exports.getDefaultPlayerPartyGroupsSync = getDefaultPlayerPartyGroupsSync;
/**
 * Inserts a default player data into the database, linked to a provided account id.
 *
 * @param accountId The account ID to link the new player to.
 * @returns The newly created player.
 */
function insertDefaultPlayerSync(accountId) {
    const player = (0, utils_2.getDefaultPlayerData)();
    const playerId = insertPlayerSync(accountId, player);
    // insert daily challenge points
    insertPlayerDailyChallengePointListSync(playerId, [
        {
            id: 1,
            point: 2,
            campaignList: [
                {
                    campaignId: 2023013101,
                    additionalPoint: 2
                }
            ]
        },
        {
            id: 251,
            point: 2,
            campaignList: [
                {
                    campaignId: 2023013102,
                    additionalPoint: 2
                }
            ]
        },
        {
            id: 5001,
            point: 10,
            campaignList: []
        },
        {
            id: 10008,
            point: 1,
            campaignList: []
        }
    ]);
    // insert triggered tutorials
    insertPlayerTriggeredTutorialsSync(playerId, []);
    // insert cleared regular missions
    insertPlayerClearedRegularMissionListSync(playerId, {});
    // insert characterList
    insertPlayerCharactersSync(playerId, {
        "1": {
            entryCount: 1,
            evolutionLevel: 0,
            overLimitStep: 0,
            protection: false,
            joinTime: new Date(),
            updateTime: new Date(),
            exp: 10,
            stack: 0,
            bondTokenList: [
                {
                    manaBoardIndex: 1,
                    status: 0
                },
                {
                    manaBoardIndex: 2,
                    status: 0
                }
            ],
            manaBoardIndex: 1
        }
    });
    // insert characterManaNodeList
    insertPlayerCharactersManaNodesSync(playerId, {});
    // insert default parties
    insertPlayerPartyGroupListSync(playerId, getDefaultPlayerPartyGroupsSync());
    // insert items
    insertPlayerItemsSync(playerId, {});
    // insert equipment
    insertPlayerEquipmentListSync(playerId, {});
    // insert quest progress
    insertPlayerQuestProgressListSync(playerId, {});
    // insert options
    insertPlayerOptionsSync(playerId, {
        "gacha_play_no_rarity_up_movie": false,
        "auto_play": false,
        "number_notation_symbol": true,
        "payment_alert": true,
        "room_number_hidden": false,
        "attention_sound_effect": true,
        "attention_vibration": false,
        "attention_enable_in_battle": true,
        "simple_ability_description": false
    });
    // insert gacha info
    insertPlayerGachaInfoListSync(playerId, []);
    // insert drawnQuestList
    insertPlayerDrawnQuestsSync(playerId, [
        {
            categoryId: 6,
            questId: 5001,
            oddsId: 5
        },
        {
            categoryId: 6,
            questId: 5002,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 5003,
            oddsId: 1
        },
        {
            categoryId: 6,
            questId: 5004,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 5005,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 13001,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 13002,
            oddsId: 4
        },
        {
            categoryId: 6,
            questId: 13003,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 13004,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 13005,
            oddsId: 9
        },
        {
            categoryId: 6,
            questId: 13006,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 14001,
            oddsId: 4
        },
        {
            categoryId: 6,
            questId: 14002,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 14003,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 14004,
            oddsId: 5
        },
        {
            categoryId: 6,
            questId: 14005,
            oddsId: 8
        },
        {
            categoryId: 6,
            questId: 14006,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 15001,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 15002,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 15003,
            oddsId: 5
        },
        {
            categoryId: 6,
            questId: 15004,
            oddsId: 4
        },
        {
            categoryId: 6,
            questId: 15005,
            oddsId: 7
        },
        {
            categoryId: 6,
            oddsId: 5,
            questId: 15006
        },
        {
            categoryId: 6,
            questId: 16001,
            oddsId: 1
        },
        {
            categoryId: 6,
            questId: 16002,
            oddsId: 8
        },
        {
            categoryId: 6,
            questId: 16003,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 16004,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 16005,
            oddsId: 1
        },
        {
            categoryId: 6,
            questId: 16006,
            oddsId: 9
        },
        {
            categoryId: 6,
            questId: 17001,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 17002,
            oddsId: 8
        },
        {
            categoryId: 6,
            questId: 17003,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 17004,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 17005,
            oddsId: 7
        },
        {
            categoryId: 6,
            questId: 17006,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 18001,
            oddsId: 8
        },
        {
            categoryId: 6,
            questId: 18002,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 18003,
            oddsId: 4
        },
        {
            categoryId: 6,
            questId: 18004,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 18005,
            oddsId: 4
        },
        {
            categoryId: 6,
            questId: 18006,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 19001,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 19002,
            oddsId: 7
        },
        {
            categoryId: 6,
            questId: 19003,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 19004,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 19005,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 19006,
            oddsId: 1
        },
        {
            categoryId: 6,
            questId: 19007,
            oddsId: 7
        },
        {
            categoryId: 6,
            questId: 19008,
            oddsId: 7
        },
        {
            categoryId: 6,
            questId: 19009,
            oddsId: 5
        },
        {
            categoryId: 6,
            questId: 19010,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 19011,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 19012,
            oddsId: 9
        },
        {
            categoryId: 6,
            questId: 19013,
            oddsId: 4
        },
        {
            categoryId: 6,
            questId: 19014,
            oddsId: 8
        },
        {
            categoryId: 6,
            questId: 19015,
            oddsId: 1
        },
        {
            categoryId: 6,
            questId: 19016,
            oddsId: 1
        },
        {
            categoryId: 6,
            questId: 19017,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 19018,
            oddsId: 4
        },
        {
            categoryId: 14,
            questId: 1001,
            oddsId: 21
        },
        {
            categoryId: 14,
            questId: 1002,
            oddsId: 30
        },
        {
            categoryId: 14,
            questId: 1003,
            oddsId: 20
        },
        {
            categoryId: 14,
            questId: 1004,
            oddsId: 27
        },
        {
            categoryId: 14,
            questId: 1005,
            oddsId: 9
        },
        {
            categoryId: 14,
            questId: 1006,
            oddsId: 35
        },
    ]);
    // insert periodicReward
    insertPlayerPeriodicRewardPointsListSync(playerId, [
        {
            id: 1,
            point: 22,
        },
        {
            id: 2,
            point: 2,
        },
        {
            id: 3,
            point: 2,
        },
        {
            id: 10000000,
            point: 2,
        },
    ]);
    // insert active missions
    insertPlayerActiveMissionsSync(playerId, {});
    // insert box gacha
    insertPlayerBoxGachasSync(playerId, {
        "1001": [
            {
                boxId: 1,
                resetTimes: 0,
                remainingNumber: 572,
                isClosed: false
            },
            {
                boxId: 2,
                resetTimes: 0,
                remainingNumber: 647,
                isClosed: false
            },
            {
                boxId: 3,
                resetTimes: 0,
                remainingNumber: 732,
                isClosed: false
            },
            {
                boxId: 4,
                resetTimes: 0,
                remainingNumber: 912,
                isClosed: false
            },
            {
                boxId: 5,
                resetTimes: 0,
                remainingNumber: 1401,
                isClosed: false
            },
        ]
    });
    // insert start dash campaign list
    insertPlayerStartDashExchangeCampaignsSync(playerId, []);
    // insert the multi special exchange campaign list
    insertPlayerMultiSpecialExchangeCampaignsSync(playerId, [
        {
            campaignId: 3,
            status: 1
        }
    ]);
    const finalPlayer = player;
    finalPlayer.id = playerId;
    return finalPlayer;
}
exports.insertDefaultPlayerSync = insertDefaultPlayerSync;
/**
 * Updates a player within the database.
 *
 * @param player The properties of the player to change. Id must always be present.
 */
function updatePlayerSync(player) {
    const id = player.id;
    const fieldMap = {
        'stamina': 'stamina',
        'staminaHealTime': 'stamina_heal_time',
        'boostPoint': 'boost_point',
        'bossBoostPoint': 'boss_boost_point',
        'transitionState': 'transition_state',
        'role': 'role',
        'name': 'name',
        'lastLoginTime': 'last_login_time',
        'comment': 'comment',
        'vmoney': 'vmoney',
        'freeVmoney': 'free_vmoney',
        'rankPoint': 'rank_point',
        'starCrumb': 'star_crumb',
        'bondToken': 'bond_token',
        'expPool': 'exp_pool',
        'expPooledTime': 'exp_pooled_time',
        'leaderCharacterId': 'leader_character_id',
        'partySlot': 'party_slot',
        'degreeId': 'degree_id',
        'birth': 'birth',
        'freeMana': 'free_mana',
        'paidMana': 'paid_mana',
        'enableAuto3x': 'enable_auto_3x',
        'tutorialStep': 'tutorial_step',
        'tutorialSkipFlag': 'tutorial_skip_flag'
    };
    const sets = [];
    const values = [];
    for (const key in player) {
        const value = player[key];
        const mapped = fieldMap[key];
        if (mapped && value !== undefined) {
            sets.push(`${mapped} = ?`);
            if (value instanceof Date) {
                values.push(value.toISOString());
            }
            else if (typeof (value) === 'boolean') {
                values.push((0, utils_2.serializeBoolean)(value));
            }
            else {
                values.push(value);
            }
        }
    }
    if (sets.length > 0)
        db.prepare(`
        UPDATE players
        SET ${sets.join(', ')}
        WHERE id = ?
        `).run([...values, id]);
}
exports.updatePlayerSync = updatePlayerSync;
/**
 * Replaces a player's data with the provided MergedPlayerData object.
 *
 * @param replaceWith The MergedPlayerData to replace.
 */
function replacePlayerDataSync(replaceWith) {
    try {
        const playerId = replaceWith.player.id;
        const account = getAccountFromPlayerIdSync(playerId);
        if (account === null)
            throw new Error("No account tied to player id.");
        // delete player
        deletePlayerSync(playerId);
        // insert new
        insertMergedPlayerDataSync(account.id, replaceWith);
    }
    catch (error) {
        console.error(error);
        throw error;
    }
}
exports.replacePlayerDataSync = replacePlayerDataSync;
/**
 * Deletes a player from the database completely.
 *
 * @param playerId The ID of the player to delete
 */
function deletePlayerSync(playerId) {
    db.prepare(`DELETE FROM players WHERE id = ?`).run(playerId);
}
exports.deletePlayerSync = deletePlayerSync;
function collectPlayerDataPooledExpSync(player, dateNow = new Date()) {
    const serverTimeNow = (0, utils_1.getServerTime)(dateNow);
    const poolTime = (0, utils_1.getServerTime)(player.expPooledTime);
    const diff = Math.max(0, serverTimeNow - poolTime);
    if (60 > diff)
        return;
    updatePlayerSync({
        id: player.id,
        expPooledTime: dateNow,
        expPool: player.expPool + Math.min(expPoolMax, Math.floor(diff / 60))
    });
}
exports.collectPlayerDataPooledExpSync = collectPlayerDataPooledExpSync;
/**
 * Collects any pooled exp that a player might have.
 * Exp regenerates at a rate of 1 per minute.
 *
 * @param playerId The ID of the player to collect the pooled EXP of.
 */
function collectPlayerPooledExpSync(playerId) {
    // exp regenerates at a rate of 1/min
    const playerData = getPlayerSync(playerId);
    if (!playerData)
        return;
    collectPlayerDataPooledExpSync(playerData);
}
exports.collectPlayerPooledExpSync = collectPlayerPooledExpSync;
/**
 * Performs a daily reset for a a player data object.
 *
 * @param player The player data to perform the daily reset for
 * @param loginDate
 * @returns A boolean; whether the daily reset was performed
 */
function dailyResetPlayerDataSync(player, loginDate = new Date()) {
    const lastLoginTime = player.lastLoginTime;
    const playerId = player.id;
    if ((loginDate.getUTCFullYear() > lastLoginTime.getUTCFullYear()) || (loginDate.getUTCMonth() > lastLoginTime.getUTCMonth()) || (loginDate.getUTCDate() > lastLoginTime.getUTCDate())) {
        // TODO: daily reset logic.
        updatePlayerSync({
            id: playerId,
            lastLoginTime: loginDate,
            bossBoostPoint: 3,
            boostPoint: 3
        });
        // reset gacha "isDailyFirst" values.
        const gachaInfo = getPlayerGachaInfoListSync(playerId);
        for (const gacha of gachaInfo) {
            updatePlayerGachaInfoSync(playerId, {
                gachaId: gacha.gachaId,
                isDailyFirst: true
            });
        }
        // reset campaigns
        const gachaCampaigns = getPlayerGachaCampaignListSync(playerId);
        for (const campaign of gachaCampaigns) {
            updatePlayerGachaCampaignSync(playerId, campaign.gachaId, campaign.campaignId, 1);
        }
        // weekly reset
        if (loginDate.getUTCDay() === 0) {
        }
        // monthly reset
        if (loginDate.getUTCDate() === 1) {
        }
        return true;
    }
    else {
        updatePlayerSync({
            id: playerId,
            lastLoginTime: loginDate,
        });
        return false;
    }
}
exports.dailyResetPlayerDataSync = dailyResetPlayerDataSync;
/**
 * Performs a daily reset for a player
 *
 * @param playerId The ID of the player to perform the daily reset for.
 * @returns A boolean; whether the daily reset was performed
 */
function dailyResetPlayerSync(playerId) {
    const playerData = getPlayerSync(playerId);
    if (!playerData)
        return false;
    return dailyResetPlayerDataSync(playerData);
}
exports.dailyResetPlayerSync = dailyResetPlayerSync;
