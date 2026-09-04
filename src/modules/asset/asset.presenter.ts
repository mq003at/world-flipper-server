import type { AssetVersionInfo, PathList } from "../../content/cdn/cdn.models";
import type { Clock } from "../../infrastructure/clock/clock";
import { createDataHeaders } from "../../protocol/worldflipper/data-headers";

export function presentVersionInfo(clock: Clock, info: AssetVersionInfo): Record<string, unknown> {
    return {
        data_headers: createDataHeaders(clock),
        data: {
            base_url: info.baseUrl,
            files_list: info.filesList,
            total_size: info.totalSize,
            delayed_assets_size: info.delayedAssetsSize,
        },
    };
}

export function presentPathList(
    clock: Clock,
    viewerId: number,
    pathList: PathList,
): Record<string, unknown> {
    return {
        data_headers: createDataHeaders(clock, {
            viewer_id: viewerId,
            asset_update: true,
        }),
        data: pathList,
    };
}
