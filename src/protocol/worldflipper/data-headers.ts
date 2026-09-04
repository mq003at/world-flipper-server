import type { Clock } from "../../infrastructure/clock/clock";

export interface DataHeaders {
    force_update?: boolean;
    asset_update?: boolean;
    short_udid?: number;
    viewer_id?: number;
    servertime?: number;
    result_code?: number;
    udid?: string;
}

export function unixSeconds(date: Date): number {
    return Math.floor(date.getTime() / 1000);
}

export function createDataHeaders(
    clock: Clock,
    customValues: Partial<DataHeaders> = {},
    fields: (keyof DataHeaders)[] = [
        "force_update",
        "asset_update",
        "short_udid",
        "viewer_id",
        "servertime",
        "result_code",
    ],
): Record<string, unknown> {
    const defaults: DataHeaders = {
        force_update: false,
        asset_update: false,
        short_udid: 0,
        viewer_id: 0,
        servertime: unixSeconds(clock.now()),
        result_code: 1,
    };

    const result: Record<string, unknown> = {};

    for (const field of fields) {
        result[field] = customValues[field] ?? defaults[field];
    }

    return result;
}
