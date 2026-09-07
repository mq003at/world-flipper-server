import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { FixedClock } from "../src/infrastructure/clock/fixed-clock";
import { createDataHeaders } from "../src/protocol/worldflipper/data-headers";

test("runtime servertime probe reports the live game clock", () => {
    const runtime = new FixedClock(new Date("2026-09-07T15:08:38.000Z"));
    const headers = createDataHeaders(runtime);
    assert.equal(headers.servertime, 1788793718);
});

test("composition root isolates the frozen shell clock from runtime services", () => {
    const source = readFileSync(path.resolve("src/app/create-app.ts"), "utf8");
    assert.match(source, /const clientClock = new FixedClock\(new Date\(gachaRotationConfig\.clientShellTime\)\)/);
    assert.match(source, /new SeasonalGachaService\([\s\S]*?gachaRotationConfig,[\s\S]*?clock,/);
});
