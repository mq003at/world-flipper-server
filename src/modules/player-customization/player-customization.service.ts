import type { IdentityService } from "../identity/identity.service";
import type { PlayerService } from "../player/player.service";
import type {
    EditPartyGroupsRequest,
    EditPartyRequest,
    PartyEditItem,
    UpdateOptionsRequest,
} from "./player-customization.contracts";
import type { PlayerCustomizationRepository } from "./player-customization.repository";

export class PlayerCustomizationService {
    constructor(
        private readonly identity: IdentityService,
        private readonly players: PlayerService,
        private readonly repository: PlayerCustomizationRepository,
    ) {}

    updateOptions(request: UpdateOptionsRequest): Record<string, boolean> {
        const player = this.requirePlayer(request.viewerId);
        this.repository.transaction(() => {
            this.repository.updateOptions(player.id, request.options);
        });
        return request.options;
    }

    editParty(request: EditPartyRequest): void {
        const player = this.requirePlayer(request.viewerId);
        this.repository.transaction(() => {
            this.repository.updateMainParty(player.id, request.mainPartyId);
            for (const party of request.parties) {
                this.repository.updateParty(player.id, this.removeUnownedEntries(player.id, party));
            }
        });
    }

    editPartyGroups(request: EditPartyGroupsRequest): void {
        const player = this.requirePlayer(request.viewerId);
        this.repository.transaction(() => {
            for (const group of request.groups) {
                this.repository.updatePartyGroup(
                    player.id,
                    group.partyGroupId,
                    group.partyCategory,
                    group.colorId,
                );
            }
        });
    }

    private requirePlayer(viewerId: number): { id: number } {
        const viewer = this.identity.requireViewerSession(viewerId);
        return this.players.requireForAccount(viewer.accountId);
    }

    private removeUnownedEntries(playerId: number, party: PartyEditItem): PartyEditItem {
        return {
            ...party,
            characterIds: party.characterIds.map((id) =>
                id !== null && this.repository.ownsCharacter(playerId, id) ? id : null,
            ),
            unisonCharacterIds: party.unisonCharacterIds.map((id) =>
                id !== null && this.repository.ownsCharacter(playerId, id) ? id : null,
            ),
            equipmentIds: party.equipmentIds.map((id) =>
                id !== null && this.repository.ownsEquipment(playerId, id) ? id : null,
            ),
        };
    }
}
