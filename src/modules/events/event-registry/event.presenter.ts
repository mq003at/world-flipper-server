import { serializeClientDate } from "../../../protocol/worldflipper/client-time";
import type { PlayerActiveEventView } from "./event.service";

export function presentActiveEvent(event: PlayerActiveEventView): Record<string, unknown> {
    return {
        event_key: event.definition.id,
        event_id: event.definition.eventId,
        event_kind: event.definition.kind,
        schedule_id: event.definition.scheduleId,
        release_at: serializeClientDate(event.releaseAt),
        active_until: serializeClientDate(event.activeUntil),
        grace_until: serializeClientDate(event.graceUntil),
        joined_at: serializeClientDate(event.state.joinedAt),
        last_seen_at: serializeClientDate(event.state.lastSeenAt),
    };
}
