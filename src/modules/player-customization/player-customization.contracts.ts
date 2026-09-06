import { InvalidRequestError } from "../../shared/errors/application-error";

export interface UpdateOptionsRequest {
    viewerId: number;
    options: Record<string, boolean>;
}

export interface PartyEditItem {
    partyEdited: boolean;
    partyCategory: number;
    partyName: string;
    partyId: number;
    unisonCharacterIds: Array<number | null>;
    equipmentIds: Array<number | null>;
    characterIds: Array<number | null>;
    abilitySoulIds: Array<number | null>;
    allowOtherPlayersToHealMe: boolean;
}

export interface EditPartyRequest {
    viewerId: number;
    mainPartyId: number;
    parties: PartyEditItem[];
}

export interface EditPartyGroupsRequest {
    viewerId: number;
    groups: Array<{
        partyGroupId: number;
        partyCategory: number;
        colorId: number;
    }>;
}

function asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new InvalidRequestError();
    }
    return value as Record<string, unknown>;
}

function finiteInteger(value: unknown): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
        throw new InvalidRequestError();
    }
    return value;
}

function nullableIdList(value: unknown): Array<number | null> {
    if (!Array.isArray(value) || value.length !== 3) throw new InvalidRequestError();
    return value.map((entry) => {
        if (entry === null) return null;
        const id = finiteInteger(entry);
        if (id <= 0) throw new InvalidRequestError();
        return id;
    });
}

export function parseUpdateOptions(value: unknown): UpdateOptionsRequest {
    const body = asRecord(value);
    const viewerId = finiteInteger(body.viewer_id);
    if (viewerId <= 0) throw new InvalidRequestError();

    const rawOptions = asRecord(body.option_params);
    const options: Record<string, boolean> = {};
    for (const [key, option] of Object.entries(rawOptions)) {
        if (typeof option !== "boolean") throw new InvalidRequestError();
        options[key] = option;
    }
    return { viewerId, options };
}

export function parseEditParty(value: unknown): EditPartyRequest {
    const body = asRecord(value);
    const viewerId = finiteInteger(body.viewer_id);
    const mainPartyId = finiteInteger(body.main_party_id);
    if (viewerId <= 0 || mainPartyId <= 0 || !Array.isArray(body.party_info_list)) {
        throw new InvalidRequestError();
    }

    const parties = body.party_info_list.map((entry): PartyEditItem => {
        const party = asRecord(entry);
        const options = asRecord(party.options);
        if (
            typeof party.party_edited !== "boolean" ||
            typeof party.party_name !== "string" ||
            typeof options.allow_other_players_to_heal_me !== "boolean"
        ) {
            throw new InvalidRequestError();
        }
        const partyId = finiteInteger(party.party_id);
        const partyCategory = finiteInteger(party.party_category);
        if (partyId <= 0 || partyCategory < 0) throw new InvalidRequestError();

        return {
            partyEdited: party.party_edited,
            partyCategory,
            partyName: party.party_name,
            partyId,
            unisonCharacterIds: nullableIdList(party.unison_character_ids),
            equipmentIds: nullableIdList(party.equipment_ids),
            characterIds: nullableIdList(party.character_ids),
            abilitySoulIds: nullableIdList(party.ability_soul_ids),
            allowOtherPlayersToHealMe: options.allow_other_players_to_heal_me,
        };
    });

    return { viewerId, mainPartyId, parties };
}

export function parseEditPartyGroups(value: unknown): EditPartyGroupsRequest {
    const body = asRecord(value);
    const viewerId = finiteInteger(body.viewer_id);
    if (viewerId <= 0 || !Array.isArray(body.party_group_edit_params_list)) {
        throw new InvalidRequestError();
    }

    return {
        viewerId,
        groups: body.party_group_edit_params_list.map((entry) => {
            const group = asRecord(entry);
            const partyGroupId = finiteInteger(group.party_group_id);
            const partyCategory = finiteInteger(group.party_category);
            const colorId = finiteInteger(group.party_group_color_id);
            if (partyGroupId <= 0 || partyCategory < 0 || colorId < 0) {
                throw new InvalidRequestError();
            }
            return { partyGroupId, partyCategory, colorId };
        }),
    };
}
