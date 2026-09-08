import path from "node:path";
import { loadConfig } from "../src/app/config";
import { createDatabase } from "../src/infrastructure/database/database";

function positiveInteger(raw: string | undefined, label: string): number {
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid ${label}.`);
    return value;
}

function parseArguments(): { databasePath: string; playerId: number; amount: number } {
    const args = process.argv.slice(2);
    let databasePath = loadConfig().databasePath;
    let playerId: number | undefined;
    let amount = 2100;
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        const value = args[index + 1];
        if (arg === "--database" && value) {
            databasePath = path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
            index += 1;
        } else if (arg === "--player-id" && value) {
            playerId = positiveInteger(value, "player id");
            index += 1;
        } else if (arg === "--amount" && value) {
            amount = positiveInteger(value, "amount");
            index += 1;
        } else {
            throw new Error(`Unknown or incomplete argument: ${arg}`);
        }
    }
    if (playerId === undefined) throw new Error("--player-id is required.");
    return { databasePath, playerId, amount };
}

function main(): void {
    const args = parseArguments();
    const database = createDatabase(args.databasePath);
    try {
        const result = database.prepare(`
            UPDATE players SET star_crumb = star_crumb + ? WHERE id = ?
            RETURNING star_crumb
        `).get(args.amount, args.playerId) as { star_crumb: number } | undefined;
        if (!result) throw new Error(`Player ${args.playerId} does not exist.`);
        console.log(`Added ${args.amount} Star Sliver to player ${args.playerId}. New balance: ${result.star_crumb}.`);
    } finally {
        database.close();
    }
}

main();
