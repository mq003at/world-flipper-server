import type { MailDefinition } from "./mail.models";

export interface MailCatalog {
    list(): readonly MailDefinition[];
}
