import { pack, unpack } from "msgpackr";

export function decodeBase64MessagePack(body: string): unknown {
    return unpack(Buffer.from(body, "base64"));
}

export function encodeBase64MessagePack(payload: unknown): string {
    return pack(payload).toString("base64");
}

export function parseJsonBody(body: string): unknown {
    // Legacy Starpoint tolerated empty or malformed JSON on Kakao/OpenAPI
    // compatibility routes. Some clients POST an empty form body to endpoints
    // such as /v3/util/country/get while still declaring
    // application/x-www-form-urlencoded. Treat those bodies as absent instead
    // of turning a compatibility quirk into a server error.
    if (body.trim().length === 0) return undefined;

    try {
        return JSON.parse(body);
    } catch {
        return undefined;
    }
}
