export enum PartyCategory {
    EMPTY = 0,
    NORMAL = 1,
    EMPTY2 = 2,
    EMPTY3 = 3,
    EVENT = 4,
}

export interface Player {
    id: number;
    accountId: number;
    stamina: number;
    staminaHealTime: Date;
    boostPoint: number;
    bossBoostPoint: number;
    transitionState: number;
    role: number;
    name: string;
    lastLoginTime: Date;
    comment: string;
    vmoney: number;
    freeVmoney: number;
    rankPoint: number;
    starCrumb: number;
    bondToken: number;
    expPool: number;
    expPooledTime: Date;
    leaderCharacterId: number;
    partySlot: number;
    degreeId: number;
    birth: number;
    freeMana: number;
    paidMana: number;
    enableAuto3x: boolean;
    tutorialStep: number | null;
    tutorialSkipFlag: boolean | null;
}

export interface DailyChallengeCampaign {
    campaignId: number;
    additionalPoint: number;
}

export interface DailyChallengeEntry {
    id: number;
    point: number;
    campaignList: DailyChallengeCampaign[];
}

export interface CharacterBondToken {
    manaBoardIndex: number;
    status: number;
}

export interface CharacterExBoost {
    statusId: number;
    abilityIdList: number[];
}

export interface PlayerCharacter {
    entryCount: number;
    evolutionLevel: number;
    overLimitStep: number;
    protection: boolean;
    joinTime: Date;
    updateTime: Date;
    exp: number;
    stack: number;
    manaBoardIndex: number;
    bondTokenList: CharacterBondToken[];
    exBoost?: CharacterExBoost;
    illustrationSettings?: number[];
}

export interface PlayerParty {
    name: string;
    characterIds: Array<number | null>;
    unisonCharacterIds: Array<number | null>;
    equipmentIds: Array<number | null>;
    abilitySoulIds: Array<number | null>;
    edited: boolean;
    allowOtherPlayersToHealMe: boolean;
    category: PartyCategory;
}

export interface PlayerPartyGroup {
    colorId: number;
    category: PartyCategory;
    list: Record<string, PlayerParty>;
}

export interface PlayerEquipment {
    level: number;
    enhancementLevel: number;
    protection: boolean;
    stack: number;
}

export interface PlayerQuestProgress {
    questId: number;
    finished: boolean;
    highScore?: number;
    clearRank?: number;
    bestElapsedTimeMs?: number;
}

export interface PlayerGachaInfo {
    gachaId: number;
    isDailyFirst: boolean;
    isAccountFirst: boolean;
    gachaExchangePoint?: number;
}

export interface PlayerGachaCampaign {
    gachaId: number;
    campaignId: number;
    count: number;
}

export interface PlayerDrawnQuest {
    categoryId: number;
    questId: number;
    oddsId: number;
}

export interface PlayerPeriodicRewardPoint {
    id: number;
    point: number;
}

export interface PlayerActiveMission {
    progress: number;
    stages: Record<string, boolean>;
}

export interface PlayerBoxGacha {
    boxId: number;
    resetTimes: number;
    remainingNumber: number;
    isClosed: boolean;
}

export interface PlayerStartDashExchangeCampaign {
    campaignId: number;
    gachaId: number;
    termIndex: number;
    status: number;
    periodStartTime: Date;
    periodEndTime: Date;
}

export interface PlayerMultiSpecialExchangeCampaign {
    campaignId: number;
    status: number;
}

export interface PlayerSnapshot {
    player: Player;
    dailyChallengePointList: DailyChallengeEntry[];
    triggeredTutorial: number[];
    clearedRegularMissionList: Record<string, number>;
    characterList: Record<string, PlayerCharacter>;
    characterManaNodeList: Record<string, number[]>;
    partyGroupList: Record<string, PlayerPartyGroup>;
    itemList: Record<string, number>;
    equipmentList: Record<string, PlayerEquipment>;
    questProgress: Record<string, PlayerQuestProgress[]>;
    gachaInfoList: PlayerGachaInfo[];
    gachaCampaignList: PlayerGachaCampaign[];
    drawnQuestList: PlayerDrawnQuest[];
    periodicRewardPointList: PlayerPeriodicRewardPoint[];
    allActiveMissionList: Record<string, PlayerActiveMission>;
    boxGachaList: Record<string, PlayerBoxGacha[]>;
    startDashExchangeCampaignList: PlayerStartDashExchangeCampaign[];
    multiSpecialExchangeCampaignList: PlayerMultiSpecialExchangeCampaign[];
    userOption: Record<string, boolean>;
}

export interface InitialPlayerState extends Omit<PlayerSnapshot, "player"> {
    player: Omit<Player, "id" | "accountId">;
}
