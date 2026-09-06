import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
    return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("migrated compatibility groups remain mounted at client paths", () => {
    const app = source("src/app/create-app.ts");
    const requiredRegistrations = [
        'prefix: "/latest/api/index.php/option"',
        'prefix: "/latest/api/index.php/party"',
        'prefix: "/latest/api/index.php/party_group"',
        'prefix: "/latest/api/index.php/attention"',
        'prefix: "/latest/api/index.php/encyclopedia"',
        'prefix: "/latest/api/index.php/event/rush"',
        'prefix: "/latest/api/index.php/event/raid"',
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
