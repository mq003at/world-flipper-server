import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadConfig } from "../src/app/config";
import { SystemClock } from "../src/infrastructure/clock/system-clock";
import { createDatabase } from "../src/infrastructure/database/database";
import { SqlitePlayerDataRepository } from "../src/modules/player-data/player-data.repository.sqlite";
import { PlayerDataService } from "../src/modules/player-data/player-data.service";

interface Arguments {
    command: "export" | "import";
    playerId?: number;
    viewerId?: number;
    input?: string;
    output?: string;
    database?: string;
    replace: boolean;
}

function usage(): never {
    console.error(`Usage:
  pnpm player:export -- --player-id <id> [--out <file>] [--database <db>]
  pnpm player:export -- --viewer-id <id> [--out <file>] [--database <db>]
  pnpm player:import -- --player-id <id> --in <file> --replace [--database <db>]
  pnpm player:import -- --viewer-id <id> --in <file> --replace [--database <db>]

Import replaces the target player's game state but preserves the target account and sessions.`);
    process.exit(2);
}

function positiveInteger(raw: string | undefined, name: string): number {
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid ${name}.`);
    return value;
}

function parseArguments(): Arguments {
    const [commandRaw, ...rest] = process.argv.slice(2);
    if (commandRaw !== "export" && commandRaw !== "import") usage();
    const result: Arguments = { command: commandRaw, replace: false };
    for (let index = 0; index < rest.length; index += 1) {
        const arg = rest[index];
        const next = rest[index + 1];
        switch (arg) {
            case "--player-id":
                result.playerId = positiveInteger(next, "player id");
                index += 1;
                break;
            case "--viewer-id":
                result.viewerId = positiveInteger(next, "viewer id");
                index += 1;
                break;
            case "--in":
                if (!next) throw new Error("Missing --in value.");
                result.input = next;
                index += 1;
                break;
            case "--out":
                if (!next) throw new Error("Missing --out value.");
                result.output = next;
                index += 1;
                break;
            case "--database":
                if (!next) throw new Error("Missing --database value.");
                result.database = next;
                index += 1;
                break;
            case "--replace":
                result.replace = true;
                break;
            default:
                throw new Error(`Unknown argument: ${arg}`);
        }
    }
    if ((result.playerId === undefined) === (result.viewerId === undefined)) {
        throw new Error("Specify exactly one of --player-id or --viewer-id.");
    }
    if (result.command === "import" && (!result.input || !result.replace)) {
        throw new Error("Import requires --in <file> and --replace.");
    }
    return result;
}

function resolveDatabasePath(raw: string | undefined): string {
    if (!raw) return loadConfig().databasePath;
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

function main(): void {
    const args = parseArguments();
    const databasePath = resolveDatabasePath(args.database);
    const database = createDatabase(databasePath);
    try {
        const repository = new SqlitePlayerDataRepository(database);
        const service = new PlayerDataService(repository, new SystemClock());
        const playerId = args.playerId ?? repository.findPlayerIdByViewerId(args.viewerId as number);
        if (playerId === null || !repository.playerExists(playerId)) {
            throw new Error("Target player does not exist (or viewer session is unavailable).");
        }

        if (args.command === "export") {
            const save = service.exportPlayer(playerId);
            const output = path.resolve(
                process.cwd(),
                args.output ?? `var/exports/player-${playerId}-${Date.now()}.json`,
            );
            mkdirSync(path.dirname(output), { recursive: true });
            writeFileSync(output, `${JSON.stringify(save, null, 2)}\n`, "utf8");
            console.log(`Exported player ${playerId} -> ${output}`);
            return;
        }

        const inputPath = path.resolve(process.cwd(), args.input as string);
        const save = JSON.parse(readFileSync(inputPath, "utf8")) as unknown;
        const result = service.importPlayer(playerId, save);
        console.log(
            `Imported ${result.importedRows} rows across ${result.importedSections} sections into player ${playerId}.`,
        );
    } finally {
        database.close();
    }
}

try {
    main();
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
}
