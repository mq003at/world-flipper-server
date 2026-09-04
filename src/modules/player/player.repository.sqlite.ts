import type { DatabaseConnection } from "../../infrastructure/database/database";
import {
    PartyCategory,
    type CharacterBondToken,
    type InitialPlayerState,
    type Player,
    type PlayerActiveMission,
    type PlayerBoxGacha,
    type PlayerCharacter,
    type PlayerEquipment,
    type PlayerGachaCampaign,
    type PlayerGachaInfo,
    type PlayerParty,
    type PlayerPartyGroup,
    type PlayerQuestProgress,
    type PlayerSnapshot,
} from "./player.models";
import type { PlayerRepository } from "./player.repository";

interface PlayerRow {
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

const PLAYER_COLUMNS = `
    id, account_id, stamina, stamina_heal_time, boost_point, boss_boost_point,
    transition_state, role, name, last_login_time, comment, vmoney, free_vmoney,
    rank_point, star_crumb, bond_token, exp_pool, exp_pooled_time,
    leader_character_id, party_slot, degree_id, birth, free_mana, paid_mana,
    enable_auto_3x, tutorial_step, tutorial_skip_flag
`;

function toDbBoolean(value: boolean): number {
    return value ? 1 : 0;
}

function fromDbBoolean(value: number): boolean {
    return value === 1;
}

function serializeNumberList(values: number[]): string {
    return values.join(",");
}

function deserializeNumberList(value: string | null): number[] | undefined {
    if (value === null) return undefined;
    if (value.length === 0) return [];
    return value.split(",").map((part) => Number(part));
}

function mapPlayer(row: PlayerRow): Player {
    return {
        id: row.id,
        accountId: row.account_id,
        stamina: row.stamina,
        staminaHealTime: new Date(row.stamina_heal_time),
        boostPoint: row.boost_point,
        bossBoostPoint: row.boss_boost_point,
        transitionState: row.transition_state,
        role: row.role,
        name: row.name,
        lastLoginTime: new Date(row.last_login_time),
        comment: row.comment,
        vmoney: row.vmoney,
        freeVmoney: row.free_vmoney,
        rankPoint: row.rank_point,
        starCrumb: row.star_crumb,
        bondToken: row.bond_token,
        expPool: row.exp_pool,
        expPooledTime: new Date(row.exp_pooled_time),
        leaderCharacterId: row.leader_character_id,
        partySlot: row.party_slot,
        degreeId: row.degree_id,
        birth: row.birth,
        freeMana: row.free_mana,
        paidMana: row.paid_mana,
        enableAuto3x: fromDbBoolean(row.enable_auto_3x),
        tutorialStep: row.tutorial_step,
        tutorialSkipFlag:
            row.tutorial_skip_flag === null ? null : fromDbBoolean(row.tutorial_skip_flag),
    };
}

export class SqlitePlayerRepository implements PlayerRepository {
    constructor(private readonly database: DatabaseConnection) {}

    findById(playerId: number): Player | null {
        const row = this.database
            .prepare(`SELECT ${PLAYER_COLUMNS} FROM players WHERE id = ?`)
            .get(playerId) as PlayerRow | undefined;
        return row ? mapPlayer(row) : null;
    }

    findByAccountId(accountId: number): Player | null {
        const row = this.database
            .prepare(`SELECT ${PLAYER_COLUMNS} FROM players WHERE account_id = ? ORDER BY id LIMIT 1`)
            .get(accountId) as PlayerRow | undefined;
        return row ? mapPlayer(row) : null;
    }

    createInitial(accountId: number, state: InitialPlayerState): Player {
        return this.transaction(() => {
            const p = state.player;
            const result = this.database
                .prepare(`
                    INSERT INTO players (
                        stamina, stamina_heal_time, boost_point, boss_boost_point,
                        transition_state, role, name, last_login_time, comment,
                        vmoney, free_vmoney, rank_point, star_crumb, bond_token,
                        exp_pool, exp_pooled_time, leader_character_id, party_slot,
                        degree_id, birth, free_mana, paid_mana, enable_auto_3x,
                        account_id, tutorial_step, tutorial_skip_flag
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `)
                .run(
                    p.stamina,
                    p.staminaHealTime.toISOString(),
                    p.boostPoint,
                    p.bossBoostPoint,
                    p.transitionState,
                    p.role,
                    p.name,
                    p.lastLoginTime.toISOString(),
                    p.comment,
                    p.vmoney,
                    p.freeVmoney,
                    p.rankPoint,
                    p.starCrumb,
                    p.bondToken,
                    p.expPool,
                    p.expPooledTime.toISOString(),
                    p.leaderCharacterId,
                    p.partySlot,
                    p.degreeId,
                    p.birth,
                    p.freeMana,
                    p.paidMana,
                    toDbBoolean(p.enableAuto3x),
                    accountId,
                    p.tutorialStep,
                    p.tutorialSkipFlag === null ? null : toDbBoolean(p.tutorialSkipFlag),
                );

            const playerId = Number(result.lastInsertRowid);
            this.insertInitialCollections(playerId, state);

            const player = this.findById(playerId);
            if (!player) throw new Error("Created player could not be read back.");
            return player;
        });
    }

    loadSnapshot(playerId: number): PlayerSnapshot | null {
        const player = this.findById(playerId);
        if (!player) return null;

        return {
            player,
            dailyChallengePointList: this.loadDailyChallengePoints(playerId),
            triggeredTutorial: this.loadTriggeredTutorials(playerId),
            clearedRegularMissionList: this.loadClearedRegularMissions(playerId),
            characterList: this.loadCharacters(playerId),
            characterManaNodeList: this.loadCharacterManaNodes(playerId),
            partyGroupList: this.loadPartyGroups(playerId),
            itemList: this.loadItems(playerId),
            equipmentList: this.loadEquipment(playerId),
            questProgress: this.loadQuestProgress(playerId),
            gachaInfoList: this.loadGachaInfo(playerId),
            gachaCampaignList: this.loadGachaCampaigns(playerId),
            drawnQuestList: this.loadDrawnQuests(playerId),
            periodicRewardPointList: this.loadPeriodicRewardPoints(playerId),
            allActiveMissionList: this.loadActiveMissions(playerId),
            boxGachaList: this.loadBoxGacha(playerId),
            startDashExchangeCampaignList: this.loadStartDashCampaigns(playerId),
            multiSpecialExchangeCampaignList: this.loadMultiSpecialCampaigns(playerId),
            userOption: this.loadOptions(playerId),
        };
    }

    updateLoginState(
        playerId: number,
        changes: {
            lastLoginTime: Date;
            boostPoint?: number;
            bossBoostPoint?: number;
            resetDailyGacha?: boolean;
            resetGachaCampaigns?: boolean;
        },
    ): void {
        this.transaction(() => {
            const fields = ["last_login_time = ?"];
            const values: Array<string | number> = [changes.lastLoginTime.toISOString()];

            if (changes.boostPoint !== undefined) {
                fields.push("boost_point = ?");
                values.push(changes.boostPoint);
            }
            if (changes.bossBoostPoint !== undefined) {
                fields.push("boss_boost_point = ?");
                values.push(changes.bossBoostPoint);
            }

            this.database
                .prepare(`UPDATE players SET ${fields.join(", ")} WHERE id = ?`)
                .run(...values, playerId);

            if (changes.resetDailyGacha) {
                this.database
                    .prepare("UPDATE players_gacha_info SET is_daily_first = 1 WHERE player_id = ?")
                    .run(playerId);
            }

            if (changes.resetGachaCampaigns) {
                this.database
                    .prepare("UPDATE players_gacha_campaigns SET count = 1 WHERE player_id = ?")
                    .run(playerId);
            }
        });
    }

    updatePooledExp(playerId: number, expPool: number, expPooledTime: Date): void {
        this.database
            .prepare(`
                UPDATE players
                SET exp_pool = ?, exp_pooled_time = ?
                WHERE id = ?
            `)
            .run(expPool, expPooledTime.toISOString(), playerId);
    }

    transaction<T>(work: () => T): T {
        return this.database.transaction(work)();
    }

    private insertInitialCollections(playerId: number, state: InitialPlayerState): void {
        const insertDaily = this.database.prepare(`
            INSERT INTO daily_challenge_point_list_entries (id, point, player_id)
            VALUES (?, ?, ?)
        `);
        const insertDailyCampaign = this.database.prepare(`
            INSERT INTO daily_challenge_point_list_campaigns (
                campaign_id, additional_point, list_entry_id, player_id
            ) VALUES (?, ?, ?, ?)
        `);
        for (const entry of state.dailyChallengePointList) {
            insertDaily.run(entry.id, entry.point, playerId);
            for (const campaign of entry.campaignList) {
                insertDailyCampaign.run(
                    campaign.campaignId,
                    campaign.additionalPoint,
                    entry.id,
                    playerId,
                );
            }
        }

        const insertTriggeredTutorial = this.database.prepare(`
            INSERT INTO players_triggered_tutorials (id, player_id) VALUES (?, ?)
        `);
        for (const tutorialId of state.triggeredTutorial) {
            insertTriggeredTutorial.run(tutorialId, playerId);
        }

        const insertClearedMission = this.database.prepare(`
            INSERT INTO players_cleared_regular_missions (id, value, player_id)
            VALUES (?, ?, ?)
        `);
        for (const [missionId, value] of Object.entries(state.clearedRegularMissionList)) {
            insertClearedMission.run(Number(missionId), value, playerId);
        }

        const insertCharacter = this.database.prepare(`
            INSERT INTO players_characters (
                id, entry_count, evolution_level, over_limit_step, protection,
                join_time, update_time, exp, stack, mana_board_index, player_id,
                ex_boost_status_id, ex_boost_ability_id_list, illustration_settings
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertBondToken = this.database.prepare(`
            INSERT INTO players_characters_bond_tokens (
                mana_board_index, status, player_id, character_id
            ) VALUES (?, ?, ?, ?)
        `);
        for (const [characterId, character] of Object.entries(state.characterList)) {
            insertCharacter.run(
                Number(characterId),
                character.entryCount,
                character.evolutionLevel,
                character.overLimitStep,
                toDbBoolean(character.protection),
                character.joinTime.toISOString(),
                character.updateTime.toISOString(),
                character.exp,
                character.stack,
                character.manaBoardIndex,
                playerId,
                character.exBoost?.statusId ?? null,
                character.exBoost ? serializeNumberList(character.exBoost.abilityIdList) : null,
                character.illustrationSettings
                    ? serializeNumberList(character.illustrationSettings)
                    : null,
            );

            for (const token of character.bondTokenList) {
                insertBondToken.run(token.manaBoardIndex, token.status, playerId, Number(characterId));
            }
        }

        const insertManaNode = this.database.prepare(`
            INSERT INTO players_characters_mana_nodes (value, character_id, player_id)
            VALUES (?, ?, ?)
        `);
        for (const [characterId, nodes] of Object.entries(state.characterManaNodeList)) {
            for (const node of nodes) {
                insertManaNode.run(node, Number(characterId), playerId);
            }
        }

        const insertPartyGroup = this.database.prepare(`
            INSERT INTO players_party_groups (id, color_id, player_id, category)
            VALUES (?, ?, ?, ?)
        `);
        const insertParty = this.database.prepare(`
            INSERT INTO players_parties (
                slot, name, character_id_1, character_id_2, character_id_3,
                unison_character_1, unison_character_2, unison_character_3,
                equipment_1, equipment_2, equipment_3,
                ability_soul_1, ability_soul_2, ability_soul_3,
                edited, player_id, group_id, category
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const [groupId, group] of Object.entries(state.partyGroupList)) {
            insertPartyGroup.run(Number(groupId), group.colorId, playerId, group.category);
            for (const [slot, party] of Object.entries(group.list)) {
                insertParty.run(
                    Number(slot),
                    party.name,
                    party.characterIds[0] ?? null,
                    party.characterIds[1] ?? null,
                    party.characterIds[2] ?? null,
                    party.unisonCharacterIds[0] ?? null,
                    party.unisonCharacterIds[1] ?? null,
                    party.unisonCharacterIds[2] ?? null,
                    party.equipmentIds[0] ?? null,
                    party.equipmentIds[1] ?? null,
                    party.equipmentIds[2] ?? null,
                    party.abilitySoulIds[0] ?? null,
                    party.abilitySoulIds[1] ?? null,
                    party.abilitySoulIds[2] ?? null,
                    toDbBoolean(party.edited),
                    playerId,
                    Number(groupId),
                    party.category,
                );
            }
        }

        const insertItem = this.database.prepare(`
            INSERT INTO players_items (id, amount, player_id) VALUES (?, ?, ?)
        `);
        for (const [itemId, amount] of Object.entries(state.itemList)) {
            insertItem.run(Number(itemId), amount, playerId);
        }

        const insertEquipment = this.database.prepare(`
            INSERT INTO players_equipment (
                id, level, enhancement_level, protection, stack, player_id
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const [equipmentId, equipment] of Object.entries(state.equipmentList)) {
            insertEquipment.run(
                Number(equipmentId),
                equipment.level,
                equipment.enhancementLevel,
                toDbBoolean(equipment.protection),
                equipment.stack,
                playerId,
            );
        }

        const insertQuestProgress = this.database.prepare(`
            INSERT INTO players_quest_progress (
                section, quest_id, finished, high_score, clear_rank,
                best_elapsed_time_ms, player_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const [section, progressList] of Object.entries(state.questProgress)) {
            for (const progress of progressList) {
                insertQuestProgress.run(
                    Number(section),
                    progress.questId,
                    toDbBoolean(progress.finished),
                    progress.highScore ?? null,
                    progress.clearRank ?? null,
                    progress.bestElapsedTimeMs ?? null,
                    playerId,
                );
            }
        }

        const insertGachaInfo = this.database.prepare(`
            INSERT INTO players_gacha_info (
                gacha_id, is_daily_first, is_account_first, gacha_exchange_point, player_id
            ) VALUES (?, ?, ?, ?, ?)
        `);
        for (const info of state.gachaInfoList) {
            insertGachaInfo.run(
                info.gachaId,
                toDbBoolean(info.isDailyFirst),
                toDbBoolean(info.isAccountFirst),
                info.gachaExchangePoint ?? null,
                playerId,
            );
        }

        const insertGachaCampaign = this.database.prepare(`
            INSERT INTO players_gacha_campaigns (gacha_id, campaign_id, count, player_id)
            VALUES (?, ?, ?, ?)
        `);
        for (const campaign of state.gachaCampaignList) {
            insertGachaCampaign.run(campaign.gachaId, campaign.campaignId, campaign.count, playerId);
        }

        const insertDrawnQuest = this.database.prepare(`
            INSERT INTO players_drawn_quests (category_id, quest_id, odds_id, player_id)
            VALUES (?, ?, ?, ?)
        `);
        for (const quest of state.drawnQuestList) {
            insertDrawnQuest.run(quest.categoryId, quest.questId, quest.oddsId, playerId);
        }

        const insertPeriodic = this.database.prepare(`
            INSERT INTO players_periodic_reward_points (id, point, player_id)
            VALUES (?, ?, ?)
        `);
        for (const reward of state.periodicRewardPointList) {
            insertPeriodic.run(reward.id, reward.point, playerId);
        }

        const insertActiveMission = this.database.prepare(`
            INSERT INTO players_active_missions (id, progress, player_id)
            VALUES (?, ?, ?)
        `);
        const insertActiveStage = this.database.prepare(`
            INSERT INTO players_active_missions_stages (id, status, player_id, mission_id)
            VALUES (?, ?, ?, ?)
        `);
        for (const [missionId, mission] of Object.entries(state.allActiveMissionList)) {
            insertActiveMission.run(Number(missionId), mission.progress, playerId);
            for (const [stageId, status] of Object.entries(mission.stages)) {
                insertActiveStage.run(Number(stageId), toDbBoolean(status), playerId, Number(missionId));
            }
        }

        const insertBoxGacha = this.database.prepare(`
            INSERT INTO players_box_gacha (
                id, box_id, reset_times, remaining_number, is_closed, player_id
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const [gachaId, boxes] of Object.entries(state.boxGachaList)) {
            for (const box of boxes) {
                insertBoxGacha.run(
                    Number(gachaId),
                    box.boxId,
                    box.resetTimes,
                    box.remainingNumber,
                    toDbBoolean(box.isClosed),
                    playerId,
                );
            }
        }

        const insertStartDash = this.database.prepare(`
            INSERT INTO players_start_dash_exchange_campaigns (
                campaign_id, gacha_id, term_index, status,
                period_start_time, period_end_time, player_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const campaign of state.startDashExchangeCampaignList) {
            insertStartDash.run(
                campaign.campaignId,
                campaign.gachaId,
                campaign.termIndex,
                campaign.status,
                campaign.periodStartTime.toISOString(),
                campaign.periodEndTime.toISOString(),
                playerId,
            );
        }

        const insertMultiSpecial = this.database.prepare(`
            INSERT INTO players_multi_special_exchange_campaigns (campaign_id, status, player_id)
            VALUES (?, ?, ?)
        `);
        for (const campaign of state.multiSpecialExchangeCampaignList) {
            insertMultiSpecial.run(campaign.campaignId, campaign.status, playerId);
        }

        const insertOption = this.database.prepare(`
            INSERT INTO players_options (key, value, player_id) VALUES (?, ?, ?)
        `);
        for (const [key, value] of Object.entries(state.userOption)) {
            insertOption.run(key, toDbBoolean(value), playerId);
        }
    }

    private loadDailyChallengePoints(playerId: number) {
        const entries = this.database
            .prepare(`
                SELECT id, point
                FROM daily_challenge_point_list_entries
                WHERE player_id = ?
                ORDER BY id
            `)
            .all(playerId) as Array<{ id: number; point: number }>;

        const campaigns = this.database
            .prepare(`
                SELECT campaign_id, additional_point, list_entry_id
                FROM daily_challenge_point_list_campaigns
                WHERE player_id = ?
                ORDER BY campaign_id
            `)
            .all(playerId) as Array<{
                campaign_id: number;
                additional_point: number;
                list_entry_id: number;
            }>;

        const buckets = new Map<number, Array<{ campaignId: number; additionalPoint: number }>>();
        for (const campaign of campaigns) {
            const bucket = buckets.get(campaign.list_entry_id) ?? [];
            bucket.push({
                campaignId: campaign.campaign_id,
                additionalPoint: campaign.additional_point,
            });
            buckets.set(campaign.list_entry_id, bucket);
        }

        return entries.map((entry) => ({
            id: entry.id,
            point: entry.point,
            campaignList: buckets.get(entry.id) ?? [],
        }));
    }

    private loadTriggeredTutorials(playerId: number): number[] {
        const rows = this.database
            .prepare("SELECT id FROM players_triggered_tutorials WHERE player_id = ? ORDER BY id")
            .all(playerId) as Array<{ id: number }>;
        return rows.map((row) => row.id);
    }

    private loadClearedRegularMissions(playerId: number): Record<string, number> {
        const rows = this.database
            .prepare("SELECT id, value FROM players_cleared_regular_missions WHERE player_id = ?")
            .all(playerId) as Array<{ id: number; value: number }>;
        return Object.fromEntries(rows.map((row) => [String(row.id), row.value]));
    }

    private loadCharacters(playerId: number): Record<string, PlayerCharacter> {
        const rows = this.database
            .prepare(`
                SELECT id, entry_count, evolution_level, over_limit_step, protection,
                       join_time, update_time, exp, stack, mana_board_index,
                       ex_boost_status_id, ex_boost_ability_id_list, illustration_settings
                FROM players_characters
                WHERE player_id = ?
            `)
            .all(playerId) as Array<{
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
                ex_boost_status_id: number | null;
                ex_boost_ability_id_list: string | null;
                illustration_settings: string | null;
            }>;

        const bondRows = this.database
            .prepare(`
                SELECT mana_board_index, status, character_id
                FROM players_characters_bond_tokens
                WHERE player_id = ?
                ORDER BY mana_board_index
            `)
            .all(playerId) as Array<{
                mana_board_index: number;
                status: number;
                character_id: number;
            }>;

        const bondBuckets = new Map<number, CharacterBondToken[]>();
        for (const row of bondRows) {
            const bucket = bondBuckets.get(row.character_id) ?? [];
            bucket.push({ manaBoardIndex: row.mana_board_index, status: row.status });
            bondBuckets.set(row.character_id, bucket);
        }

        const result: Record<string, PlayerCharacter> = {};
        for (const row of rows) {
            const character: PlayerCharacter = {
                entryCount: row.entry_count,
                evolutionLevel: row.evolution_level,
                overLimitStep: row.over_limit_step,
                protection: fromDbBoolean(row.protection),
                joinTime: new Date(row.join_time),
                updateTime: new Date(row.update_time),
                exp: row.exp,
                stack: row.stack,
                manaBoardIndex: row.mana_board_index,
                bondTokenList: bondBuckets.get(row.id) ?? [],
            };

            const abilityIdList = deserializeNumberList(row.ex_boost_ability_id_list);
            if (row.ex_boost_status_id !== null && abilityIdList !== undefined) {
                character.exBoost = {
                    statusId: row.ex_boost_status_id,
                    abilityIdList,
                };
            }

            const illustrationSettings = deserializeNumberList(row.illustration_settings);
            if (illustrationSettings !== undefined) {
                character.illustrationSettings = illustrationSettings;
            }

            result[String(row.id)] = character;
        }
        return result;
    }

    private loadCharacterManaNodes(playerId: number): Record<string, number[]> {
        const rows = this.database
            .prepare(`
                SELECT value, character_id
                FROM players_characters_mana_nodes
                WHERE player_id = ?
                ORDER BY value
            `)
            .all(playerId) as Array<{ value: number; character_id: number }>;

        const result: Record<string, number[]> = {};
        for (const row of rows) {
            const key = String(row.character_id);
            (result[key] ??= []).push(row.value);
        }
        return result;
    }

    private loadPartyGroups(playerId: number): Record<string, PlayerPartyGroup> {
        const groups = this.database
            .prepare(`
                SELECT id, color_id, category
                FROM players_party_groups
                WHERE player_id = ? AND category = ?
                ORDER BY id
            `)
            .all(playerId, PartyCategory.NORMAL) as Array<{
                id: number;
                color_id: number;
                category: number;
            }>;

        const parties = this.database
            .prepare(`
                SELECT slot, name,
                       character_id_1, character_id_2, character_id_3,
                       unison_character_1, unison_character_2, unison_character_3,
                       equipment_1, equipment_2, equipment_3,
                       ability_soul_1, ability_soul_2, ability_soul_3,
                       edited, group_id, category
                FROM players_parties
                WHERE player_id = ? AND category = ?
                ORDER BY group_id, slot
            `)
            .all(playerId, PartyCategory.NORMAL) as Array<{
                slot: number;
                name: string;
                character_id_1: number | null;
                character_id_2: number | null;
                character_id_3: number | null;
                unison_character_1: number | null;
                unison_character_2: number | null;
                unison_character_3: number | null;
                equipment_1: number | null;
                equipment_2: number | null;
                equipment_3: number | null;
                ability_soul_1: number | null;
                ability_soul_2: number | null;
                ability_soul_3: number | null;
                edited: number;
                group_id: number;
                category: number;
            }>;

        const partyBuckets = new Map<number, Record<string, PlayerParty>>();
        for (const row of parties) {
            const bucket = partyBuckets.get(row.group_id) ?? {};
            bucket[String(row.slot)] = {
                name: row.name,
                characterIds: [row.character_id_1, row.character_id_2, row.character_id_3],
                unisonCharacterIds: [
                    row.unison_character_1,
                    row.unison_character_2,
                    row.unison_character_3,
                ],
                equipmentIds: [row.equipment_1, row.equipment_2, row.equipment_3],
                abilitySoulIds: [row.ability_soul_1, row.ability_soul_2, row.ability_soul_3],
                edited: fromDbBoolean(row.edited),
                allowOtherPlayersToHealMe: true,
                category: row.category as PartyCategory,
            };
            partyBuckets.set(row.group_id, bucket);
        }

        const result: Record<string, PlayerPartyGroup> = {};
        for (const group of groups) {
            result[String(group.id)] = {
                colorId: group.color_id,
                category: group.category as PartyCategory,
                list: partyBuckets.get(group.id) ?? {},
            };
        }
        return result;
    }

    private loadItems(playerId: number): Record<string, number> {
        const rows = this.database
            .prepare("SELECT id, amount FROM players_items WHERE player_id = ?")
            .all(playerId) as Array<{ id: number; amount: number }>;
        return Object.fromEntries(rows.map((row) => [String(row.id), row.amount]));
    }

    private loadEquipment(playerId: number): Record<string, PlayerEquipment> {
        const rows = this.database
            .prepare(`
                SELECT id, level, enhancement_level, protection, stack
                FROM players_equipment
                WHERE player_id = ?
            `)
            .all(playerId) as Array<{
                id: number;
                level: number;
                enhancement_level: number;
                protection: number;
                stack: number;
            }>;

        return Object.fromEntries(
            rows.map((row) => [
                String(row.id),
                {
                    level: row.level,
                    enhancementLevel: row.enhancement_level,
                    protection: fromDbBoolean(row.protection),
                    stack: row.stack,
                },
            ]),
        );
    }

    private loadQuestProgress(playerId: number): Record<string, PlayerQuestProgress[]> {
        const rows = this.database
            .prepare(`
                SELECT section, quest_id, finished, high_score, clear_rank, best_elapsed_time_ms
                FROM players_quest_progress
                WHERE player_id = ?
                ORDER BY section, quest_id
            `)
            .all(playerId) as Array<{
                section: number;
                quest_id: number;
                finished: number;
                high_score: number | null;
                clear_rank: number | null;
                best_elapsed_time_ms: number | null;
            }>;

        const result: Record<string, PlayerQuestProgress[]> = {};
        for (const row of rows) {
            const key = String(row.section);
            (result[key] ??= []).push({
                questId: row.quest_id,
                finished: fromDbBoolean(row.finished),
                ...(row.high_score === null ? {} : { highScore: row.high_score }),
                ...(row.clear_rank === null ? {} : { clearRank: row.clear_rank }),
                ...(row.best_elapsed_time_ms === null
                    ? {}
                    : { bestElapsedTimeMs: row.best_elapsed_time_ms }),
            });
        }
        return result;
    }

    private loadGachaInfo(playerId: number): PlayerGachaInfo[] {
        const rows = this.database
            .prepare(`
                SELECT gacha_id, is_daily_first, is_account_first, gacha_exchange_point
                FROM players_gacha_info
                WHERE player_id = ?
                ORDER BY gacha_id
            `)
            .all(playerId) as Array<{
                gacha_id: number;
                is_daily_first: number;
                is_account_first: number;
                gacha_exchange_point: number | null;
            }>;

        return rows.map((row) => ({
            gachaId: row.gacha_id,
            isDailyFirst: fromDbBoolean(row.is_daily_first),
            isAccountFirst: fromDbBoolean(row.is_account_first),
            ...(row.gacha_exchange_point === null
                ? {}
                : { gachaExchangePoint: row.gacha_exchange_point }),
        }));
    }

    private loadGachaCampaigns(playerId: number): PlayerGachaCampaign[] {
        const rows = this.database
            .prepare(`
                SELECT gacha_id, campaign_id, count
                FROM players_gacha_campaigns
                WHERE player_id = ?
                ORDER BY gacha_id, campaign_id
            `)
            .all(playerId) as Array<{ gacha_id: number; campaign_id: number; count: number }>;

        return rows.map((row) => ({
            gachaId: row.gacha_id,
            campaignId: row.campaign_id,
            count: row.count,
        }));
    }

    private loadDrawnQuests(playerId: number) {
        const rows = this.database
            .prepare(`
                SELECT category_id, quest_id, odds_id
                FROM players_drawn_quests
                WHERE player_id = ?
                ORDER BY category_id, quest_id
            `)
            .all(playerId) as Array<{ category_id: number; quest_id: number; odds_id: number }>;

        return rows.map((row) => ({
            categoryId: row.category_id,
            questId: row.quest_id,
            oddsId: row.odds_id,
        }));
    }

    private loadPeriodicRewardPoints(playerId: number) {
        const rows = this.database
            .prepare(`
                SELECT id, point
                FROM players_periodic_reward_points
                WHERE player_id = ?
                ORDER BY id
            `)
            .all(playerId) as Array<{ id: number; point: number }>;
        return rows.map((row) => ({ id: row.id, point: row.point }));
    }

    private loadActiveMissions(playerId: number): Record<string, PlayerActiveMission> {
        const missions = this.database
            .prepare("SELECT id, progress FROM players_active_missions WHERE player_id = ?")
            .all(playerId) as Array<{ id: number; progress: number }>;
        const stages = this.database
            .prepare(`
                SELECT id, status, mission_id
                FROM players_active_missions_stages
                WHERE player_id = ?
            `)
            .all(playerId) as Array<{ id: number; status: number; mission_id: number }>;

        const stageBuckets = new Map<number, Record<string, boolean>>();
        for (const stage of stages) {
            const bucket = stageBuckets.get(stage.mission_id) ?? {};
            bucket[String(stage.id)] = fromDbBoolean(stage.status);
            stageBuckets.set(stage.mission_id, bucket);
        }

        return Object.fromEntries(
            missions.map((mission) => [
                String(mission.id),
                {
                    progress: mission.progress,
                    stages: stageBuckets.get(mission.id) ?? {},
                },
            ]),
        );
    }

    private loadBoxGacha(playerId: number): Record<string, PlayerBoxGacha[]> {
        const rows = this.database
            .prepare(`
                SELECT id, box_id, reset_times, remaining_number, is_closed
                FROM players_box_gacha
                WHERE player_id = ?
                ORDER BY id, box_id
            `)
            .all(playerId) as Array<{
                id: number;
                box_id: number;
                reset_times: number;
                remaining_number: number;
                is_closed: number;
            }>;

        const result: Record<string, PlayerBoxGacha[]> = {};
        for (const row of rows) {
            const key = String(row.id);
            (result[key] ??= []).push({
                boxId: row.box_id,
                resetTimes: row.reset_times,
                remainingNumber: row.remaining_number,
                isClosed: fromDbBoolean(row.is_closed),
            });
        }
        return result;
    }

    private loadStartDashCampaigns(playerId: number) {
        const rows = this.database
            .prepare(`
                SELECT campaign_id, gacha_id, term_index, status,
                       period_start_time, period_end_time
                FROM players_start_dash_exchange_campaigns
                WHERE player_id = ?
                ORDER BY campaign_id
            `)
            .all(playerId) as Array<{
                campaign_id: number;
                gacha_id: number;
                term_index: number;
                status: number;
                period_start_time: string;
                period_end_time: string;
            }>;

        return rows.map((row) => ({
            campaignId: row.campaign_id,
            gachaId: row.gacha_id,
            termIndex: row.term_index,
            status: row.status,
            periodStartTime: new Date(row.period_start_time),
            periodEndTime: new Date(row.period_end_time),
        }));
    }

    private loadMultiSpecialCampaigns(playerId: number) {
        const rows = this.database
            .prepare(`
                SELECT campaign_id, status
                FROM players_multi_special_exchange_campaigns
                WHERE player_id = ?
                ORDER BY campaign_id
            `)
            .all(playerId) as Array<{ campaign_id: number; status: number }>;

        return rows.map((row) => ({ campaignId: row.campaign_id, status: row.status }));
    }

    private loadOptions(playerId: number): Record<string, boolean> {
        const rows = this.database
            .prepare("SELECT key, value FROM players_options WHERE player_id = ?")
            .all(playerId) as Array<{ key: string; value: number }>;
        return Object.fromEntries(rows.map((row) => [row.key, fromDbBoolean(row.value)]));
    }
}
