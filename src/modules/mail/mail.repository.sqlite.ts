import type { DatabaseConnection } from "../../infrastructure/database/database";
import type { Reward } from "../reward/reward.models";
import type { PlayerMail } from "./mail.models";
import type { MailRepository } from "./mail.repository";

interface MailRow {
    id: number;
    player_id: number;
    source_key: string;
    title: string;
    body: string;
    rewards_json: string;
    created_at: string;
    expires_at: string | null;
    read_at: string | null;
    claimed_at: string | null;
}

function fromRow(row: MailRow): PlayerMail {
    return {
        id: row.id,
        playerId: row.player_id,
        sourceKey: row.source_key,
        title: row.title,
        body: row.body,
        rewards: JSON.parse(row.rewards_json) as Reward[],
        createdAt: new Date(row.created_at),
        expiresAt: row.expires_at === null ? null : new Date(row.expires_at),
        readAt: row.read_at === null ? null : new Date(row.read_at),
        claimedAt: row.claimed_at === null ? null : new Date(row.claimed_at),
    };
}

export class SqliteMailRepository implements MailRepository {
    constructor(private readonly database: DatabaseConnection) {}

    findBySourceKey(playerId: number, sourceKey: string): PlayerMail | null {
        const row = this.database.prepare(`
            SELECT * FROM player_mail WHERE player_id = ? AND source_key = ?
        `).get(playerId, sourceKey) as MailRow | undefined;
        return row ? fromRow(row) : null;
    }

    findById(playerId: number, mailId: number): PlayerMail | null {
        const row = this.database.prepare(`
            SELECT * FROM player_mail WHERE player_id = ? AND id = ?
        `).get(playerId, mailId) as MailRow | undefined;
        return row ? fromRow(row) : null;
    }

    insert(mail: Omit<PlayerMail, "id">): PlayerMail {
        const result = this.database.prepare(`
            INSERT INTO player_mail (
                player_id, source_key, title, body, rewards_json,
                created_at, expires_at, read_at, claimed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            mail.playerId,
            mail.sourceKey,
            mail.title,
            mail.body,
            JSON.stringify(mail.rewards),
            mail.createdAt.toISOString(),
            mail.expiresAt?.toISOString() ?? null,
            mail.readAt?.toISOString() ?? null,
            mail.claimedAt?.toISOString() ?? null,
        );
        return { ...mail, id: Number(result.lastInsertRowid) };
    }

    list(playerId: number, now: Date, limit: number, offset: number): PlayerMail[] {
        const rows = this.database.prepare(`
            SELECT * FROM player_mail
            WHERE player_id = ? AND (expires_at IS NULL OR expires_at > ?)
            ORDER BY created_at DESC, id DESC
            LIMIT ? OFFSET ?
        `).all(playerId, now.toISOString(), limit, offset) as MailRow[];
        return rows.map(fromRow);
    }

    listClaimable(playerId: number, now: Date): PlayerMail[] {
        const rows = this.database.prepare(`
            SELECT * FROM player_mail
            WHERE player_id = ?
              AND claimed_at IS NULL
              AND (expires_at IS NULL OR expires_at > ?)
            ORDER BY created_at ASC, id ASC
        `).all(playerId, now.toISOString()) as MailRow[];
        return rows.map(fromRow);
    }

    count(playerId: number, now: Date): number {
        const row = this.database.prepare(`
            SELECT COUNT(*) AS count FROM player_mail
            WHERE player_id = ? AND (expires_at IS NULL OR expires_at > ?)
        `).get(playerId, now.toISOString()) as { count: number };
        return row.count;
    }

    hasUnread(playerId: number, now: Date): boolean {
        const row = this.database.prepare(`
            SELECT 1 AS found FROM player_mail
            WHERE player_id = ?
              AND read_at IS NULL
              AND (expires_at IS NULL OR expires_at > ?)
            LIMIT 1
        `).get(playerId, now.toISOString()) as { found: number } | undefined;
        return row !== undefined;
    }

    markRead(playerId: number, mailIds: readonly number[], at: Date): void {
        if (mailIds.length === 0) return;
        const statement = this.database.prepare(`
            UPDATE player_mail SET read_at = COALESCE(read_at, ?)
            WHERE player_id = ? AND id = ?
        `);
        for (const id of mailIds) statement.run(at.toISOString(), playerId, id);
    }

    markClaimed(playerId: number, mailIds: readonly number[], at: Date): void {
        if (mailIds.length === 0) return;
        const statement = this.database.prepare(`
            UPDATE player_mail SET claimed_at = ?, read_at = COALESCE(read_at, ?)
            WHERE player_id = ? AND id = ? AND claimed_at IS NULL
        `);
        for (const id of mailIds) statement.run(at.toISOString(), at.toISOString(), playerId, id);
    }

    transaction<T>(work: () => T): T {
        return this.database.transaction(work)();
    }
}
