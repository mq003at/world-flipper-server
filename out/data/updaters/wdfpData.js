"use strict";
// Updates an outdated wdfp_data database
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAfterInit = exports.updateBeforeInit = void 0;
/**
 * Updates a database before its initialization function has been called.
 *
 * @param database A better-sqlite3 database.
 */
function updateBeforeInit(database, currentVersion) {
    if (0 >= currentVersion) {
        // update to version 1
        // rush event; players_parties table
        database.prepare(`ALTER TABLE players_parties RENAME TO players_parties_old`).run();
        // rush event; players_party_groups table
        database.prepare(`ALTER TABLE players_party_groups RENAME TO players_party_groups_old`).run();
    }
    if (1 >= currentVersion) {
        // update to version 2
        // delete players_party_options table
        database.prepare(`
        DROP TABLE players_party_options
        `).run();
    }
}
exports.updateBeforeInit = updateBeforeInit;
/**
 * Updates a database after its initialization function has been called.
 *
 * @param database A better-sqlite3 database.
 */
function updateAfterInit(database, currentVersion) {
    if (0 >= currentVersion) {
        // update to version 1
        // rush event; players_party_groups table
        database.prepare(`
        INSERT INTO players_party_groups
        SELECT *, 1 FROM players_party_groups_old
        `).run();
        // rush event; players_parties table
        database.prepare(`
        INSERT INTO players_parties
        SELECT *, 1 FROM players_parties_old
        `).run();
        database.prepare(`DELETE FROM players_parties_old`).run();
        database.prepare(`DELETE FROM players_party_groups_old`).run();
    }
}
exports.updateAfterInit = updateAfterInit;
