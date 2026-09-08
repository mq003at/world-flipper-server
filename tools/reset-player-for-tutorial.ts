import { mkdirSync } from "node:fs";
import path from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { loadConfig } from "../src/app/config";

interface Arguments {
    databasePath: string;
    playerId: number;
    confirmed: boolean;
}

function parseArguments(): Arguments {
    let databasePath = loadConfig().databasePath;
    let playerId = 0;
    let confirmed = false;
    for (let index = 2; index < process.argv.length; index += 1) {
        const value = process.argv[index];
        if (value === "--player-id") playerId = Number(process.argv[++index]);
        else if (value === "--database") {
            const raw = process.argv[++index] ?? "";
            databasePath = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
        } else if (value === "--confirm-delete-account") confirmed = true;
    }
    if (!Number.isSafeInteger(playerId) || playerId <= 0) {
        throw new Error("Usage: pnpm player:reset-tutorial -- --player-id 2 --confirm-delete-account [--database path]");
    }
    return { databasePath, playerId, confirmed };
}

const args = parseArguments();
if (!args.confirmed) {
    throw new Error("Refusing destructive reset without --confirm-delete-account. Stop Starpoint first; the command creates a DB backup automatically.");
}
if (args.databasePath === ":memory:") throw new Error("Tutorial reset requires a file-backed database.");

const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const backupDir = path.resolve(process.cwd(), "var/backups");
mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `world-flipper-before-tutorial-reset-${stamp}.db`);

const database = new BetterSqlite3(args.databasePath);
try {
    database.pragma("foreign_keys = ON");
    // VACUUM INTO produces a transactionally consistent standalone backup even
    // when the source database uses WAL mode.
    database.prepare("VACUUM INTO ?").run(backupPath);
    const player = database.prepare("SELECT id, account_id, name FROM players WHERE id = ?")
        .get(args.playerId) as { id: number; account_id: number; name: string } | undefined;
    if (!player) throw new Error(`Player ${args.playerId} does not exist. Backup retained at ${backupPath}`);
    const remove = database.transaction(() => database.prepare("DELETE FROM accounts WHERE id = ?").run(player.account_id));
    const result = remove();
    if (result.changes !== 1) throw new Error(`Account ${player.account_id} was not deleted. Backup retained at ${backupPath}`);
    console.log(`Deleted account ${player.account_id} and player ${player.id} (${player.name}) with cascading save/session cleanup.`);
    console.log(`Backup: ${backupPath}`);
    console.log("Clear the game's app data before relaunching so it performs loginDevice + signup and starts the tutorial from scratch.");
} finally {
    database.close();
}
