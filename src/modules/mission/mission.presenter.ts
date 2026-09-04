import type { MissionProgressView } from "./mission.models";
import type { RewardGrantResult } from "../reward/reward.models";
import { presentGrantedCharacter, presentGrantedEquipment } from "../reward/reward.presenter";

function categoryCode(period: MissionProgressView["definition"]["period"]): number {
    switch (period) {
        case "daily": return 1;
        case "weekly": return 2;
        case "regular": return 3;
    }
}

export function presentMission(view: MissionProgressView): Record<string, unknown> {
    return {
        mission_id: view.definition.id,
        category: categoryCode(view.definition.period),
        progress_value: view.state.progress,
        target_value: view.definition.target,
        is_complete: view.state.completedAt !== null,
        is_received: view.state.claimedAt !== null,
    };
}

export function presentMissionGrant(viewerId: number, grant: RewardGrantResult): Record<string, unknown> {
    return {
        user_info: {
            free_vmoney: grant.walletAfter.freeVmoney,
            free_mana: grant.walletAfter.freeMana,
            exp_pool: grant.walletAfter.expPool,
        },
        character_list: grant.characters.map((entry) => presentGrantedCharacter(entry, viewerId)),
        equipment_list: grant.equipment.map((entry) => presentGrantedEquipment(entry, viewerId)),
        items: grant.items,
    };
}
