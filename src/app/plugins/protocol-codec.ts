import type { FastifyPluginAsync, FastifyRequest } from "fastify";
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

export const protocolCodecPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.addHook("onSend", async (_request, reply, payload) => {
        const contentType = String(reply.getHeader("content-type") ?? "");
        if (!contentType.startsWith("application/x-msgpack")) return payload;

        try {
            return encodeBase64MessagePack(payload);
        } catch {
            // Compatibility behavior: if packing unexpectedly fails, let Fastify
            // return the original payload instead of taking down the request.
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
};
