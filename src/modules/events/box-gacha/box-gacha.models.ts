import type { RewardGrantResult } from "../../reward/reward.models";

export interface PlayerBoxGachaState {
    playerId: number;
    gachaId: number;
    boxId: number;
    resetTimes: number;
    remainingNumber: number;
    isClosed: boolean;
}

export interface DrawnBoxRewardState {
    rewardId: number;
    number: number;
}

export interface BoxInfoView {
    boxId: number;
    resetTimes: number;
    drawnRewards: DrawnBoxRewardState[];
    isClosed: boolean;
}

export interface BoxGachaPlayerInfo {
    freeMana: number;
    expPool: number;
    expPooledTime: Date;
}

export interface BoxExecResult {
    viewerId: number;
    drawnRewards: DrawnBoxRewardState[];
    allBoxInfo: BoxInfoView[];
    grant: RewardGrantResult;
    player: BoxGachaPlayerInfo;
    pullCurrencyId: number;
    pullCurrencyAmount: number;
}

export interface BoxListResult {
    viewerId: number;
    allBoxInfo: BoxInfoView[];
}
