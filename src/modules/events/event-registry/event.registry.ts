import type { ScheduleService } from "../../../live/schedule/schedule.service";
import { InvalidRequestError, InvariantError } from "../../../shared/errors/application-error";
import type { EventCatalog } from "./event.catalog";
import type { ActiveEventView, EventDefinition } from "./event.models";

export class EventRegistry {
    private readonly definitions: readonly EventDefinition[];

    constructor(catalog: EventCatalog, private readonly schedule: ScheduleService) {
        this.definitions = catalog.list();
        for (const definition of this.definitions) {
            if (!this.schedule.get(definition.scheduleId)) {
                throw new InvariantError(
                    `Event ${definition.id} references missing schedule ${definition.scheduleId}.`,
                );
            }
        }
    }

    listActive(now: Date): ActiveEventView[] {
        return this.definitions.flatMap((definition) => {
            const schedule = this.schedule.get(definition.scheduleId);
            if (!schedule || !this.schedule.isActive(definition.scheduleId, now)) return [];
            return [{ definition, releaseAt: schedule.releaseAt, activeUntil: schedule.activeUntil, graceUntil: schedule.graceUntil }];
        });
    }

    isQuestStartAvailable(category: number, questId: number, now: Date): boolean {
        const bound = this.eventsForQuest(category, questId);
        return bound.length === 0 || bound.some((event) => this.schedule.isActive(event.scheduleId, now));
    }

    isQuestFinishAvailable(category: number, questId: number, now: Date): boolean {
        const bound = this.eventsForQuest(category, questId);
        return bound.length === 0 || bound.some((event) => this.schedule.isWithinGrace(event.scheduleId, now));
    }

    isEventShopAvailable(eventType: number, eventId: number, now: Date): boolean {
        const bound = this.definitions.filter((event) => event.shopBindings.some(
            (binding) => binding.eventType === eventType && binding.eventId === eventId,
        ));
        return bound.length === 0 || bound.some((event) => this.schedule.isActive(event.scheduleId, now));
    }

    isBoxGachaAvailable(boxGachaId: number, now: Date): boolean {
        const bound = this.definitions.filter((event) => event.boxGachaIds.includes(boxGachaId));
        return bound.length === 0 || bound.some((event) => this.schedule.isActive(event.scheduleId, now));
    }


    isNumericEventAvailable(kind: import("./event.models").LiveEventKind, eventId: number, now: Date): boolean {
        const bound = this.definitions.filter((event) => event.kind === kind && event.eventId === eventId);
        return bound.length === 0 || bound.some((event) => this.schedule.isActive(event.scheduleId, now));
    }

    assertNumericEventAvailable(kind: import("./event.models").LiveEventKind, eventId: number, now: Date): void {
        if (!this.isNumericEventAvailable(kind, eventId, now)) {
            throw new InvalidRequestError(`${kind} event is not active.`);
        }
    }

    assertQuestStartAvailable(category: number, questId: number, now: Date): void {
        if (!this.isQuestStartAvailable(category, questId, now)) {
            throw new InvalidRequestError("Quest event is not active.");
        }
    }

    assertQuestFinishAvailable(category: number, questId: number, now: Date): void {
        if (!this.isQuestFinishAvailable(category, questId, now)) {
            throw new InvalidRequestError("Quest event is no longer available.");
        }
    }

    assertBoxGachaAvailable(boxGachaId: number, now: Date): void {
        if (!this.isBoxGachaAvailable(boxGachaId, now)) {
            throw new InvalidRequestError("Box gacha event is not active.");
        }
    }

    private eventsForQuest(category: number, questId: number): EventDefinition[] {
        return this.definitions.filter((event) => event.questRanges.some(
            (range) => range.category === category
                && questId >= range.minQuestId
                && questId <= range.maxQuestId,
        ));
    }
}
