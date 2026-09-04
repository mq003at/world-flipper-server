import type { DatabaseConnection } from "../../infrastructure/database/database";
import { InvariantError } from "../../shared/errors/application-error";
import type { Player, PlayerCharacter } from "../player/player.models";
import type {
    GrantedTutorialCharacter,
    TutorialProgressUpdate,
    TutorialRepository,
} from "./tutorial.repository";

function fromDbBoolean(value: number): boolean {
    return value === 1;
}

interface RawPlayerRow {
    id: number;
    account_id: number;
    stamina: number;
    stamina_heal_time: string;
    boost_point: number;
    boss_boost_point: number;
    transition_state: number;
    role: number;
    name: string;
    last_login_time: string;
    comment: string;
    vmoney: number;
    free_vmoney: number;
    rank_point: number;
    star_crumb: number;
    bond_token: number;
    exp_pool: number;
    exp_pooled_time: string;
    leader_character_id: number;
    party_slot: number;
    degree_id: number;
    birth: number;
    free_mana: number;
    paid_mana: number;
    enable_auto_3x: number;
    tutorial_step: number | null;
    tutorial_skip_flag: number | null;
}

interface RawCharacterRow {
    id: number;
    entry_count: number;
    evolution_level: number;
    over_limit_step: number;
    protection: number;
    join_time: string;
    update_time: string;
    exp: number;
    stack: number;
    mana_board_index: number;
}

function mapPlayer(raw: RawPlayerRow): Player {
    return {
        id: raw.id,
        accountId: raw.account_id,
        stamina: raw.stamina,
        staminaHealTime: new Date(raw.stamina_heal_time),
        boostPoint: raw.boost_point,
        bossBoostPoint: raw.boss_boost_point,
        transitionState: raw.transition_state,
        role: raw.role,
        name: raw.name,
        lastLoginTime: new Date(raw.last_login_time),
        comment: raw.comment,
        vmoney: raw.vmoney,
        freeVmoney: raw.free_vmoney,
        rankPoint: raw.rank_point,
        starCrumb: raw.star_crumb,
        bondToken: raw.bond_token,
        expPool: raw.exp_pool,
        expPooledTime: new Date(raw.exp_pooled_time),
        leaderCharacterId: raw.leader_character_id,
        partySlot: raw.party_slot,
        degreeId: raw.degree_id,
        birth: raw.birth,
        freeMana: raw.free_mana,
        paidMana: raw.paid_mana,
        enableAuto3x: fromDbBoolean(raw.enable_auto_3x),
        tutorialStep: raw.tutorial_step,
        tutorialSkipFlag:
            raw.tutorial_skip_flag === null ? null : fromDbBoolean(raw.tutorial_skip_flag),
    };
}

export class SqliteTutorialRepository implements TutorialRepository {
    constructor(private readonly database: DatabaseConnection) {}

    getTriggeredTutorialIds(playerId: number): number[] {
        const rows = this.database
            .prepare("SELECT id FROM players_triggered_tutorials WHERE player_id = ? ORDER BY id")
            .all(playerId) as Array<{ id: number }>;
        return rows.map((row) => row.id);
    }

    addTriggeredTutorialIds(playerId: number, tutorialIds: number[]): void {
        const insert = this.database.prepare(`
            INSERT OR IGNORE INTO players_triggered_tutorials (id, player_id)
            VALUES (?, ?)
        `);
        for (const tutorialId of tutorialIds) insert.run(tutorialId, playerId);
    }

    updateProgress(playerId: number, update: TutorialProgressUpdate): Player {
        const fields = ["tutorial_step = ?", "tutorial_skip_flag = ?"];
        const values: Array<string | number> = [
            update.tutorialStep,
            update.tutorialSkipFlag ? 1 : 0,
        ];

        if (update.name !== undefined) {
            fields.push("name = ?");
            values.push(update.name);
        }

        this.database
            .prepare(`UPDATE players SET ${fields.join(", ")} WHERE id = ?`)
            .run(...values, playerId);

        const raw = this.database.prepare("SELECT * FROM players WHERE id = ?").get(playerId) as
            | RawPlayerRow
            | undefined;
        if (!raw) throw new InvariantError("No player bound to account.");
        return mapPlayer(raw);
    }

    setFreeVmoney(playerId: number, freeVmoney: number): void {
        this.database
            .prepare("UPDATE players SET free_vmoney = ? WHERE id = ?")
            .run(freeVmoney, playerId);
    }

    grantCharacter(
        playerId: number,
        characterId: number,
        now: Date,
        bondTokenCount = 2,
    ): GrantedTutorialCharacter {
        const raw = this.database
            .prepare(`
                SELECT id, entry_count, evolution_level, over_limit_step, protection,
                       join_time, update_time, exp, stack, mana_board_index
                FROM players_characters
                WHERE player_id = ? AND id = ?
            `)
            .get(playerId, characterId) as RawCharacterRow | undefined;

        if (raw) {
            const nextStack = raw.stack + 1;
            this.database
                .prepare(`
                    UPDATE players_characters
                    SET stack = ?, update_time = ?
                    WHERE player_id = ? AND id = ?
                `)
                .run(nextStack, now.toISOString(), playerId, characterId);

            const bondRows = this.database
                .prepare(`
                    SELECT mana_board_index, status
                    FROM players_characters_bond_tokens
                    WHERE player_id = ? AND character_id = ?
                    ORDER BY mana_board_index
                `)
                .all(playerId, characterId) as Array<{ mana_board_index: number; status: number }>;

            return {
                characterId,
                isNew: false,
                character: {
                    entryCount: raw.entry_count,
                    evolutionLevel: raw.evolution_level,
                    overLimitStep: raw.over_limit_step,
                    protection: fromDbBoolean(raw.protection),
                    joinTime: new Date(raw.join_time),
                    updateTime: now,
                    exp: raw.exp,
                    stack: nextStack,
                    manaBoardIndex: raw.mana_board_index,
                    bondTokenList: bondRows.map((row) => ({
                        manaBoardIndex: row.mana_board_index,
                        status: row.status,
                    })),
                },
            };
        }

        this.database
            .prepare(`
                INSERT INTO players_characters (
                    id, entry_count, evolution_level, over_limit_step, protection,
                    join_time, update_time, exp, stack, mana_board_index, player_id,
                    ex_boost_status_id, ex_boost_ability_id_list, illustration_settings
                ) VALUES (?, 1, 0, 0, 0, ?, ?, 0, 0, 1, ?, NULL, NULL, NULL)
            `)
            .run(characterId, now.toISOString(), now.toISOString(), playerId);

        const insertBondToken = this.database.prepare(`
            INSERT INTO players_characters_bond_tokens (
                mana_board_index, status, player_id, character_id
            ) VALUES (?, 0, ?, ?)
        `);
        for (let index = 1; index <= bondTokenCount; index += 1) {
            insertBondToken.run(index, playerId, characterId);
        }

        const character: PlayerCharacter = {
            entryCount: 1,
            evolutionLevel: 0,
            overLimitStep: 0,
            protection: false,
            joinTime: now,
            updateTime: now,
            exp: 0,
            stack: 0,
            manaBoardIndex: 1,
            bondTokenList: Array.from({ length: bondTokenCount }, (_, index) => ({
                manaBoardIndex: index + 1,
                status: 0,
            })),
        };

        return { characterId, character, isNew: true };
    }

    transaction<T>(work: () => T): T {
        return this.database.transaction(work)();
    }
}
