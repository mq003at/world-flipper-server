import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
    return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("migrated compatibility groups remain mounted at client paths", () => {
    const app = source("src/app/routing.ts");
    const requiredRegistrations = [
        'prefix: `${api}/option`',
        'prefix: `${api}/party`',
        'prefix: `${api}/party_group`',
        'prefix: `${api}/attention`',
        'prefix: `${api}/encyclopedia`',
        'prefix: `${api}/gxshield`',
        'prefix: `${api}/event/rush`',
        'prefix: `${api}/event/raid`',
    ];

    for (const registration of requiredRegistrations) {
        assert.ok(app.includes(registration), `Missing registration ${registration}`);
    }
});

test("migrated compatibility handlers retain their client route names", () => {
    const requiredHandlers: Array<[string, string[]]> = [
        [
            "src/modules/player-customization/player-customization.routes.ts",
            [
                'fastify.post("/update"',
                'fastify.post("/update_in_battle"',
                'fastify.post("/edit"',
            ],
        ],
        ["src/modules/compatibility/attention.routes.ts", ['fastify.post("/check"']],
        ["src/modules/compatibility/gxshield.routes.ts", ['fastify.post("/scanrisk"']],
        [
            "src/modules/compatibility/encyclopedia.routes.ts",
            ['fastify.post("/index"', 'fastify.post("/read_keyword"'],
        ],
        [
            "src/modules/mail/mail.routes.ts",
            ['fastify.post("/receive"', 'fastify.post("/receive_all"'],
        ],
    ];

    for (const [file, handlers] of requiredHandlers) {
        const contents = source(file);
        for (const handler of handlers) {
            assert.ok(contents.includes(handler), `Missing ${handler} in ${file}`);
        }
    }
});
