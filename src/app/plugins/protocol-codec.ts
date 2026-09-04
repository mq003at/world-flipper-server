import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyRequest,
} from "fastify";
import {
  decodeBase64MessagePack,
  encodeBase64MessagePack,
  parseJsonBody,
} from "../../protocol/worldflipper/codec";

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

  if (fastify.hasContentTypeParser("application/x-www-form-urlencoded")) {
    fastify.removeContentTypeParser("application/x-www-form-urlencoded");
  }

  fastify.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    async (request: FastifyRequest, body: string) => {
      if (isKakaoJsonCompatibilityPath(request)) {
        return parseJsonBody(body);
      }

      return decodeBase64MessagePack(body);
    },
  );

  if (fastify.hasContentTypeParser("application/json")) {
    fastify.removeContentTypeParser("application/json");
  }

  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    async (_request: FastifyRequest, body: string) => {
      return parseJsonBody(body);
    },
  );
}

// Kept for compatibility with any external imports, but createApp intentionally
// uses registerProtocolCodec(app) so the behavior is global rather than encapsulated.
export const protocolCodecPlugin: FastifyPluginAsync = async (fastify) => {
  registerProtocolCodec(fastify);
};
