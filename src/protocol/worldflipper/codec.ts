import { pack, unpack } from "msgpackr";

export function decodeBase64MessagePack(body: string): unknown {
    return unpack(Buffer.from(body, "base64"));
}

export function encodeBase64MessagePack(payload: unknown): string {
    return pack(payload).toString("base64");
}

export function parseJsonBody(body: string): unknown {
    return JSON.parse(body);
}
