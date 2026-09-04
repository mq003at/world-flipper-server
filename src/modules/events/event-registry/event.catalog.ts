import type { EventDefinition } from "./event.models";

export interface EventCatalog {
    list(): readonly EventDefinition[];
}
