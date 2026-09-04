import type { PlayerMail } from "./mail.models";

export interface MailRepository {
    findBySourceKey(playerId: number, sourceKey: string): PlayerMail | null;
    findById(playerId: number, mailId: number): PlayerMail | null;
    insert(mail: Omit<PlayerMail, "id">): PlayerMail;
    list(playerId: number, now: Date, limit: number, offset: number): PlayerMail[];
    listClaimable(playerId: number, now: Date): PlayerMail[];
    count(playerId: number, now: Date): number;
    hasUnread(playerId: number, now: Date): boolean;
    markRead(playerId: number, mailIds: readonly number[], at: Date): void;
    markClaimed(playerId: number, mailIds: readonly number[], at: Date): void;
    transaction<T>(work: () => T): T;
}
