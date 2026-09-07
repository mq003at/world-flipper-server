import path from "node:path";
import { loadConfig } from "../src/app/config";
import { createDatabase } from "../src/infrastructure/database/database";
import {
    FULL_STAMINA_HEAL_TIME,
    MAX_STAMINA,
} from "../src/modules/stamina/infinite-stamina.policy";

function positiveInteger(raw: string, name: string): number {
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid ${name}.`);
    return value;
}

function parseArguments(): { databasePath: string; playerId?: number } {
    const args = process.argv.slice(2);
    let databasePath = loadConfig().databasePath;
    let playerId: number | undefined;
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        const value = args[index + 1];
        if (arg === "--database" && value) {
            databasePath = path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
            index += 1;
        } else if (arg === "--player-id" && value) {
            playerId = positiveInteger(value, "player id");
            index += 1;
        } else {
            throw new Error(`Unknown or incomplete argument: ${arg}`);
        }
    }
    return { databasePath, ...(playerId === undefined ? {} : { playerId }) };
}

function main(): void {
    const args = parseArguments();
    const database = createDatabase(args.databasePath);
    try {
        const healTime = FULL_STAMINA_HEAL_TIME.toISOString();
        const result = args.playerId === undefined
            ? database.prepare(`
                UPDATE players
                SET stamina = ?, stamina_heal_time = ?
                WHERE stamina <> ? OR stamina_heal_time <> ?
            `).run(MAX_STAMINA, healTime, MAX_STAMINA, healTime)
            : database.prepare(`
                UPDATE players SET stamina = ?, stamina_heal_time = ? WHERE id = ?
            `).run(MAX_STAMINA, healTime, args.playerId);
        if (args.playerId !== undefined && result.changes === 0) {
            throw new Error(`Player ${args.playerId} does not exist.`);
        }
        console.log(`Set stamina to ${MAX_STAMINA} and marked it fully healed for ${result.changes} player(s).`);
    } finally {
        database.close();
    }
}

main();
