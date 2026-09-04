export type GameplayEvent =
    | { type: "player.login"; playerId: number }
    | { type: "quest.completed"; playerId: number; questId: number; category: number; clearRank: number; story: boolean }
    | { type: "gacha.drawn"; playerId: number; gachaId: number; pullCount: number }
    | { type: "shop.purchased"; playerId: number; shopType: number; shopItemId: number; quantity: number };
