import type {
    FastifyInstance,
    FastifyPluginAsync,
    FastifyRequest,
} from "fastify";
import type { ContentTypeParserDoneFunction } from "fastify/types/content-type-parser";
import {
    decodeBase64MessagePack,
    encodeBase64MessagePack,
    parseJsonBody,
} from "../../protocol/worldflipper/codec";

function parseJson(
    _request: FastifyRequest,
    body: string,
    done: ContentTypeParserDoneFunction,
): void {
    try {
        done(null, parseJsonBody(body));
    } catch (error) {
        done(error as Error, undefined);
    }
}

function isKakaoJsonCompatibilityPath(request: FastifyRequest): boolean {
    const url = request.raw.url ?? "";
    return url.startsWith("/openapi/") || url.startsWith("/infodesk/");
}

/**
 * Installs World Flipper wire-format handling on the root Fastify instance.
 * This must run directly on the root instance: registering it as a normal
 * Fastify plugin would encapsulate the parsers/hooks away from sibling routes.
 */
export function registerProtocolCodec(fastify: FastifyInstance): void {
    fastify.addHook("onSend", async (_request, reply, payload) => {
        const contentType = String(reply.getHeader("content-type") ?? "");
        if (!contentType.startsWith("application/x-msgpack")) return payload;

        try {
            return encodeBase64MessagePack(payload);
        } catch {
            return payload;
        }
    });

    fastify.addContentTypeParser(
        "application/x-www-form-urlencoded",
        { parseAs: "string" },
        (request, body, done) => {
            if (isKakaoJsonCompatibilityPath(request)) {
                parseJson(request, body, done);
                return;
            }

            try {
                done(null, decodeBase64MessagePack(body));
            } catch (error) {
                done(error as Error, undefined);
            }
        },
    );

    fastify.addContentTypeParser(
        "application/json",
        { parseAs: "string" },
        parseJson,
    );
}

// Kept for compatibility with any external imports, but createApp intentionally
// uses registerProtocolCodec(app) so the behavior is global rather than encapsulated.
export const protocolCodecPlugin: FastifyPluginAsync = async (fastify) => {
    registerProtocolCodec(fastify);
};
