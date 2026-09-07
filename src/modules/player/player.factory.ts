import type { Clock } from "../../infrastructure/clock/clock";
import { MAX_STAMINA } from "../stamina/infinite-stamina.policy";
import {
    PartyCategory,
    type InitialPlayerState,
    type PlayerPartyGroup,
} from "./player.models";

const DRAWN_QUESTS = [
    { categoryId: 6, questId: 5001, oddsId: 5 },
    { categoryId: 6, questId: 5002, oddsId: 3 },
    { categoryId: 6, questId: 5003, oddsId: 1 },
    { categoryId: 6, questId: 5004, oddsId: 6 },
    { categoryId: 6, questId: 5005, oddsId: 2 },
    { categoryId: 6, questId: 13001, oddsId: 2 },
    { categoryId: 6, questId: 13002, oddsId: 4 },
    { categoryId: 6, questId: 13003, oddsId: 3 },
    { categoryId: 6, questId: 13004, oddsId: 2 },
    { categoryId: 6, questId: 13005, oddsId: 9 },
    { categoryId: 6, questId: 13006, oddsId: 2 },
    { categoryId: 6, questId: 14001, oddsId: 4 },
    { categoryId: 6, questId: 14002, oddsId: 3 },
    { categoryId: 6, questId: 14003, oddsId: 6 },
    { categoryId: 6, questId: 14004, oddsId: 5 },
    { categoryId: 6, questId: 14005, oddsId: 8 },
    { categoryId: 6, questId: 14006, oddsId: 6 },
    { categoryId: 6, questId: 15001, oddsId: 6 },
    { categoryId: 6, questId: 15002, oddsId: 3 },
    { categoryId: 6, questId: 15003, oddsId: 5 },
    { categoryId: 6, questId: 15004, oddsId: 4 },
    { categoryId: 6, questId: 15005, oddsId: 7 },
    { categoryId: 6, questId: 15006, oddsId: 5 },
    { categoryId: 6, questId: 16001, oddsId: 1 },
    { categoryId: 6, questId: 16002, oddsId: 8 },
    { categoryId: 6, questId: 16003, oddsId: 3 },
    { categoryId: 6, questId: 16004, oddsId: 6 },
    { categoryId: 6, questId: 16005, oddsId: 1 },
    { categoryId: 6, questId: 16006, oddsId: 9 },
    { categoryId: 6, questId: 17001, oddsId: 6 },
    { categoryId: 6, questId: 17002, oddsId: 8 },
    { categoryId: 6, questId: 17003, oddsId: 2 },
    { categoryId: 6, questId: 17004, oddsId: 3 },
    { categoryId: 6, questId: 17005, oddsId: 7 },
    { categoryId: 6, questId: 17006, oddsId: 6 },
    { categoryId: 6, questId: 18001, oddsId: 8 },
    { categoryId: 6, questId: 18002, oddsId: 3 },
    { categoryId: 6, questId: 18003, oddsId: 4 },
    { categoryId: 6, questId: 18004, oddsId: 3 },
    { categoryId: 6, questId: 18005, oddsId: 4 },
    { categoryId: 6, questId: 18006, oddsId: 6 },
    { categoryId: 6, questId: 19001, oddsId: 6 },
    { categoryId: 6, questId: 19002, oddsId: 7 },
    { categoryId: 6, questId: 19003, oddsId: 3 },
    { categoryId: 6, questId: 19004, oddsId: 3 },
    { categoryId: 6, questId: 19005, oddsId: 2 },
    { categoryId: 6, questId: 19006, oddsId: 1 },
    { categoryId: 6, questId: 19007, oddsId: 7 },
    { categoryId: 6, questId: 19008, oddsId: 7 },
    { categoryId: 6, questId: 19009, oddsId: 5 },
    { categoryId: 6, questId: 19010, oddsId: 2 },
    { categoryId: 6, questId: 19011, oddsId: 2 },
    { categoryId: 6, questId: 19012, oddsId: 9 },
    { categoryId: 6, questId: 19013, oddsId: 4 },
    { categoryId: 6, questId: 19014, oddsId: 8 },
    { categoryId: 6, questId: 19015, oddsId: 1 },
    { categoryId: 6, questId: 19016, oddsId: 1 },
    { categoryId: 6, questId: 19017, oddsId: 6 },
    { categoryId: 6, questId: 19018, oddsId: 4 },
    { categoryId: 14, questId: 1001, oddsId: 21 },
    { categoryId: 14, questId: 1002, oddsId: 30 },
    { categoryId: 14, questId: 1003, oddsId: 20 },
    { categoryId: 14, questId: 1004, oddsId: 27 },
    { categoryId: 14, questId: 1005, oddsId: 9 },
    { categoryId: 14, questId: 1006, oddsId: 35 },
] as const;

function createDefaultPartyGroups(): Record<string, PlayerPartyGroup> {
    const groups: Record<string, PlayerPartyGroup> = {};
    const partyNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    let currentParty = 1;

    for (let groupIndex = 1; groupIndex <= 6; groupIndex += 1) {
        const list: PlayerPartyGroup["list"] = {};

        for (const name of partyNames) {
            list[String(currentParty)] = {
                name: `Party ${name}`,
                characterIds: [1, null, null],
                unisonCharacterIds: [null, null, null],
                equipmentIds: [null, null, null],
                abilitySoulIds: [null, null, null],
                edited: false,
                allowOtherPlayersToHealMe: true,
                category: PartyCategory.NORMAL,
            };
            currentParty += 1;
        }

        groups[String(groupIndex)] = {
            colorId: 15,
            category: PartyCategory.NORMAL,
            list,
        };
    }

    return groups;
}

export class PlayerFactory {
    constructor(private readonly clock: Clock) {}

    createInitialState(): InitialPlayerState {
        const now = this.clock.now();

        return {
            player: {
                stamina: MAX_STAMINA,
                staminaHealTime: now,
                boostPoint: 3,
                bossBoostPoint: 3,
                transitionState: 0,
                role: 1,
                name: "플레이어",
                lastLoginTime: now,
                comment: "Nice to meet you.",
                vmoney: 0,
                freeVmoney: 150,
                rankPoint: 10,
                starCrumb: 0,
                bondToken: 0,
                expPool: 0,
                expPooledTime: now,
                leaderCharacterId: 1,
                partySlot: 1,
                degreeId: 1,
                birth: 19900101,
                freeMana: 1000,
                paidMana: 0,
                enableAuto3x: false,
                tutorialStep: 0,
                tutorialSkipFlag: null,
            },
            dailyChallengePointList: [
                { id: 1, point: 2, campaignList: [{ campaignId: 2023013101, additionalPoint: 2 }] },
                { id: 251, point: 2, campaignList: [{ campaignId: 2023013102, additionalPoint: 2 }] },
                { id: 5001, point: 10, campaignList: [] },
                { id: 10008, point: 1, campaignList: [] },
            ],
            triggeredTutorial: [],
            clearedRegularMissionList: {},
            characterList: {
                "1": {
                    entryCount: 1,
                    evolutionLevel: 0,
                    overLimitStep: 0,
                    protection: false,
                    joinTime: now,
                    updateTime: now,
                    exp: 10,
                    stack: 0,
                    manaBoardIndex: 1,
                    bondTokenList: [
                        { manaBoardIndex: 1, status: 0 },
                        { manaBoardIndex: 2, status: 0 },
                    ],
                },
            },
            characterManaNodeList: {},
            partyGroupList: createDefaultPartyGroups(),
            itemList: {},
            equipmentList: {},
            questProgress: {},
            gachaInfoList: [],
            gachaCampaignList: [],
            drawnQuestList: DRAWN_QUESTS.map((entry) => ({ ...entry })),
            periodicRewardPointList: [
                { id: 1, point: 22 },
                { id: 2, point: 2 },
                { id: 3, point: 2 },
                { id: 10000000, point: 2 },
            ],
            allActiveMissionList: {},
            boxGachaList: {
                "1001": [
                    { boxId: 1, resetTimes: 0, remainingNumber: 572, isClosed: false },
                    { boxId: 2, resetTimes: 0, remainingNumber: 647, isClosed: false },
                    { boxId: 3, resetTimes: 0, remainingNumber: 732, isClosed: false },
                    { boxId: 4, resetTimes: 0, remainingNumber: 912, isClosed: false },
                    { boxId: 5, resetTimes: 0, remainingNumber: 1401, isClosed: false },
                ],
            },
            startDashExchangeCampaignList: [],
            multiSpecialExchangeCampaignList: [{ campaignId: 3, status: 1 }],
            userOption: {
                gacha_play_no_rarity_up_movie: false,
                auto_play: false,
                number_notation_symbol: true,
                payment_alert: true,
                room_number_hidden: false,
                attention_sound_effect: true,
                attention_vibration: false,
                attention_enable_in_battle: true,
                simple_ability_description: false,
            },
        };
    }
}
