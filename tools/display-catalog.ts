import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

interface DisplayEntry {
    name: string;
    title?: string;
    iconPath?: string;
}

type SourceValue = string | DisplayEntry;

function usage(): never {
    throw new Error("Usage: pnpm catalog:build -- <characters|equipment> <source.json> [output.json]");
}

const [, , rawType, rawSource, rawOutput] = process.argv;
if ((rawType !== "characters" && rawType !== "equipment") || !rawSource) usage();

const sourcePath = path.resolve(rawSource);
if (!existsSync(sourcePath)) throw new Error(`Display catalog source not found: ${sourcePath}`);
const source = JSON.parse(readFileSync(sourcePath, "utf8")) as Record<string, SourceValue>;
const output: Record<string, DisplayEntry> = {};
const unresolved: string[] = [];

for (const [rawId, value] of Object.entries(source)) {
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`Invalid display catalog ID: ${rawId}`);
    const entry = typeof value === "string" ? { name: value } : value;
    const name = entry.name?.trim();
    if (!name) {
        unresolved.push(rawId);
        continue;
    }
    output[String(id)] = {
        name,
        ...(entry.title?.trim() ? { title: entry.title.trim() } : {}),
        ...(entry.iconPath?.trim() ? { iconPath: entry.iconPath.trim() } : {}),
    };
}

const outputPath = path.resolve(rawOutput ?? `content/display/${rawType}.en.json`);
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Display entries written: ${Object.keys(output).length}`);
console.log(`Unresolved/blank names: ${unresolved.length}`);
console.log(`Output: ${outputPath}`);

