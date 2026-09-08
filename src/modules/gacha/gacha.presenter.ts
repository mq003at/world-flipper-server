import { GachaType } from "../../content/master-data/gacha-catalog";
import { presentGrantedCharacter, presentGrantedEquipment } from "../reward/reward.presenter";
import type {
    ExchangeCharacterResult,
    ExchangeEquipmentResult,
    ExecuteGachaResult,
    PlayerGachaCampaignState,
    PlayerGachaInfoState,
    BaseSelectorResult,
} from "./gacha.models";

function presentGachaInfo(info: PlayerGachaInfoState): Record<string, unknown> {
    return {
        gacha_id: info.gachaId,
        is_account_first: info.isAccountFirst,
        is_daily_first: info.isDailyFirst,
        gacha_exchange_point: info.gachaExchangePoint,
    };
}

function presentCampaign(campaign: PlayerGachaCampaignState): Record<string, unknown> {
    return {
        gacha_id: campaign.gachaId,
        campaign_id: campaign.campaignId,
        count: campaign.count,
    };
}

function mergedCharacterList(result: ExecuteGachaResult): Record<string, unknown>[] {
    const merged = new Map<number, Record<string, unknown>>();
    for (const granted of result.characters) {
        const presented = presentGrantedCharacter(granted, result.viewerId);
        merged.set(granted.characterId, {
            ...(merged.get(granted.characterId) ?? {}),
            ...presented,
        });
    }
    return [...merged.values()];
}

function mergedEquipmentList(result: ExecuteGachaResult): Record<string, unknown>[] {
    const merged = new Map<number, Record<string, unknown>>();
    for (const granted of result.equipment) {
        merged.set(granted.equipmentId, presentGrantedEquipment(granted, result.viewerId));
    }
    return [...merged.values()];
}

export function presentExecuteGacha(result: ExecuteGachaResult): Record<string, unknown> {
    const common = {
        user_info: {
            free_vmoney: result.wallet.freeVmoney,
            vmoney: result.wallet.vmoney,
        },
        item_list: result.items,
        gacha_info_list: [presentGachaInfo(result.gachaInfo)],
        encyclopedia_info: [],
        mail_arrived: false,
    };

    if (result.gacha.type === GachaType.CHARACTER) {
        return {
            ...common,
            draw: result.characterDraws.map((draw) => ({
                character_id: draw.characterId,
                movie_id: draw.movieId,
                seed: draw.seed,
                entry_count: draw.entryCount,
                ...(draw.exBoostItem === undefined
                    ? {}
                    : { ex_boost_item: draw.exBoostItem }),
            })),
            character_list: mergedCharacterList(result),
            gacha_campaign_list: result.campaigns.map(presentCampaign),
        };
    }

    return {
        ...common,
        is_erupt: false,
        draw_equipment: result.equipmentDraws.map((draw) => ({
            equipment_id: draw.equipmentId,
            treasure_up_type: draw.treasureUpType,
        })),
        equipment_list: mergedEquipmentList(result),
    };
}

export function presentExchangeCharacter(result: ExchangeCharacterResult): Record<string, unknown> {
    const duplicate = result.granted.duplicateItem;
    return {
        character_list: [presentGrantedCharacter(result.granted, result.viewerId)],
        item_list: duplicate === undefined ? [] : { [duplicate.id]: duplicate.count },
        gacha_info_list: [presentGachaInfo(result.gachaInfo)],
        encyclopedia_info: [],
        mail_arrived: false,
    };
}

export function presentExchangeEquipment(result: ExchangeEquipmentResult): Record<string, unknown> {
    return {
        equipment_list: [presentGrantedEquipment(result.granted, result.viewerId)],
        gacha_info_list: [presentGachaInfo(result.gachaInfo)],
        encyclopedia_info: [],
        mail_arrived: false,
    };
}

export function presentBaseSelector(result: BaseSelectorResult): Record<string, unknown> {
    return {
        season_number: result.seasonNumber,
        user_info: { free_vmoney: result.wallet.freeVmoney, vmoney: result.wallet.vmoney },
        character_list: [presentGrantedCharacter(result.granted, result.viewerId)],
        encyclopedia_info: [],
        mail_arrived: false,
    };
}
