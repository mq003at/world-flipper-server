import fastifyStatic from "@fastify/static";
import type { FastifyPluginAsync } from "fastify";
import { mkdirSync } from "node:fs";

export interface StaticContentOptions {
    cdnDir: string;
}

export function createStaticContentPlugin(options: StaticContentOptions): FastifyPluginAsync {
    return async (fastify) => {
        mkdirSync(options.cdnDir, { recursive: true });

        await fastify.register(fastifyStatic, {
            root: options.cdnDir,
            prefix: "/patch/Live/2.0.0",
            decorateReply: false,
        });
    };
}
