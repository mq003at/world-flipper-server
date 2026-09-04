import path from "node:path";

export interface AppConfig {
    host: string;
    port: number;
    databasePath: string;
    cdnDir: string;
    logger: boolean;
}

function parsePort(raw: string | undefined): number {
    if (raw === undefined) return 8000;

    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 8000;
}

function resolveLocalPath(raw: string | undefined, fallback: string): string {
    const value = raw?.trim() || fallback;
    return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
    return {
        host: env.LISTEN_HOST?.trim() || "localhost",
        port: parsePort(env.LISTEN_PORT),
        databasePath: resolveLocalPath(env.DATABASE_PATH, "var/database/world-flipper.db"),
        cdnDir: resolveLocalPath(env.CDN_DIR, ".cdn"),
        logger: env.LOG_LEVEL !== "silent",
    };
}
