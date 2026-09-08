import { unixSeconds } from "../../protocol/worldflipper/data-headers";
import { presentGrantedCharacter, presentGrantedEquipment } from "../reward/reward.presenter";
import type { ShopBuyResult, ShopSale } from "./shop.models";

export function presentSalesList(sales: readonly ShopSale[]): Record<string, unknown> {
    return {
        sales_list: sales.map((sale) => ({
            shop_item_id: sale.item.id,
            stock_quantity: sale.stockQuantity,
            today_purchase_num: sale.todayPurchaseNum,
            this_month_purchase_num: sale.thisMonthPurchaseNum,
            total_purchase_num: sale.totalPurchaseNum,
            group_info: {
                // Group-level stock is not represented by the extracted shop master data.
                // Preserve the legacy compatibility defaults instead of inventing a group cap.
                group_total_stock_quantity: -1,
                group_total_purchase_num: 0,
                multi_stage: false,
            },
            shop_type: sale.shopType,
        })),
    };
}

export function presentShopBuy(result: ShopBuyResult): Record<string, unknown> {
    return {
        user_info: {
            star_crumb: result.state.starCrumb,
            free_mana: result.state.freeMana,
            free_vmoney: result.state.freeVmoney,
            exp_pool: result.state.expPool,
            exp_pooled_time: unixSeconds(result.state.expPooledTime),
            bond_token: result.state.bondToken,
        },
        joined_character_id_list: result.grant.characters
            .filter((character) => character.isNew)
            .map((character) => character.characterId),
        character_list: result.grant.characters.map((character) =>
            presentGrantedCharacter(character, result.viewerId),
        ),
        equipment_list: result.grant.equipment.map((equipment) =>
            presentGrantedEquipment(equipment, result.viewerId),
        ),
        item_list: result.itemList,
        mail_arrived: false,
    };
}
