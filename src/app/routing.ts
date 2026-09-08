import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export const CLIENT_API_PREFIX = "/latest/api/index.php";

export interface ApplicationRoutes {
    identity: FastifyPluginAsync;
    infodesk: FastifyPluginAsync;
    bootstrap: FastifyPluginAsync;
    playerData: FastifyPluginAsync;
    asset: FastifyPluginAsync;
    tutorial: FastifyPluginAsync;
    option: FastifyPluginAsync;
    party: FastifyPluginAsync;
    partyGroup: FastifyPluginAsync;
    attention: FastifyPluginAsync;
    encyclopedia: FastifyPluginAsync;
    gacha: FastifyPluginAsync;
    gachaProbability: FastifyPluginAsync;
    singleBattleQuest: FastifyPluginAsync;
    storyQuest: FastifyPluginAsync;
    mission: FastifyPluginAsync;
    mail: FastifyPluginAsync;
    event: FastifyPluginAsync;
    boxGacha: FastifyPluginAsync;
    rushEvent: FastifyPluginAsync;
    rankingEvent: FastifyPluginAsync;
    raidEvent: FastifyPluginAsync;
    multiBattleQuest: FastifyPluginAsync;
    shop: FastifyPluginAsync;
    payment: FastifyPluginAsync;
    reproduce: FastifyPluginAsync;
    gxshield: FastifyPluginAsync;
    staticContent: FastifyPluginAsync;
    adminWeb: FastifyPluginAsync;
}

interface RouteMount {
    plugin: FastifyPluginAsync;
    prefix?: string;
}

/**
 * The only application-level routing composition root.
 *
 * Feature modules own their relative paths. This file owns public prefixes and
 * compatibility aliases. Do not add feature handlers to this composition root.
 */
export async function registerApplicationRoutes(
    app: FastifyInstance,
    routes: ApplicationRoutes,
): Promise<void> {
    const api = CLIENT_API_PREFIX;
    const mounts: RouteMount[] = [
        { plugin: routes.identity, prefix: "/openapi/service" },
        { plugin: routes.infodesk, prefix: "/infodesk" },
        { plugin: routes.bootstrap, prefix: api },
        { plugin: routes.playerData, prefix: `${api}/player_data` },
        { plugin: routes.asset, prefix: `${api}/asset` },
        { plugin: routes.tutorial, prefix: `${api}/tutorial` },
        { plugin: routes.option, prefix: `${api}/option` },
        { plugin: routes.party, prefix: `${api}/party` },
        { plugin: routes.partyGroup, prefix: `${api}/party_group` },
        { plugin: routes.attention, prefix: `${api}/attention` },
        { plugin: routes.encyclopedia, prefix: `${api}/encyclopedia` },
        { plugin: routes.gacha, prefix: `${api}/gacha` },
        { plugin: routes.gachaProbability, prefix: "/web_api/gacha" },
        { plugin: routes.singleBattleQuest, prefix: `${api}/single_battle_quest` },
        { plugin: routes.storyQuest, prefix: `${api}/story_quest` },
        { plugin: routes.mission, prefix: `${api}/mission` },
        { plugin: routes.mail, prefix: `${api}/mail` },
        { plugin: routes.event, prefix: `${api}/event` },
        { plugin: routes.boxGacha, prefix: `${api}/box_gacha` },
        { plugin: routes.rushEvent, prefix: `${api}/event/rush` },
        { plugin: routes.rankingEvent, prefix: `${api}/ranking_event` },
        { plugin: routes.raidEvent, prefix: `${api}/event/raid` },
        { plugin: routes.multiBattleQuest, prefix: `${api}/multi_battle_quest` },
        { plugin: routes.shop, prefix: `${api}/shop` },
        { plugin: routes.payment, prefix: `${api}/payment` },
        { plugin: routes.reproduce, prefix: `${api}/reproduce` },
        { plugin: routes.gxshield, prefix: `${api}/gxshield` },
        { plugin: routes.staticContent },
        { plugin: routes.adminWeb },
    ];

    for (const mount of mounts) {
        if (mount.prefix === undefined) {
            await app.register(mount.plugin);
        } else {
            await app.register(mount.plugin, { prefix: mount.prefix });
        }
    }
}
