import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
    return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("routing composition root mounts the client-facing route groups", () => {
    const routing = source("src/app/routing.ts");
    const requiredPrefixes = [
        "`${api}/gacha`",
        "`${api}/option`",
        "`${api}/party`",
        "`${api}/party_group`",
        "`${api}/event/rush`",
        "`${api}/event/raid`",
        '"/openapi/service"',
        '"/infodesk"',
    ];

    for (const prefix of requiredPrefixes) {
        assert.ok(routing.includes(prefix), `Missing route prefix ${prefix}`);
    }
});

test("application source no longer imports the legacy route tree", () => {
    const createApp = source("src/app/create-app.ts");
    const routing = source("src/app/routing.ts");
    assert.doesNotMatch(createApp, /src\/routes|\.\.\/routes/);
    assert.doesNotMatch(routing, /src\/routes|\.\.\/routes/);
});

test("cleanup scripts cover exactly the three legacy route groups", () => {
    const powershell = source("scripts/cleanup-legacy-routes.ps1");
    const shell = source("scripts/cleanup-legacy-routes.sh");

    for (const group of ["api", "web", "web_api"]) {
        assert.ok(powershell.includes(`\"${group}\"`), `PowerShell cleanup misses ${group}`);
        assert.ok(shell.includes(group), `POSIX cleanup misses ${group}`);
    }

    assert.ok(existsSync(path.join(process.cwd(), "src/app/routing.ts")));
});
