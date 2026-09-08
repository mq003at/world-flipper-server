import fastifyStatic from "@fastify/static";
import type { FastifyPluginAsync } from "fastify";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { DisplayCatalog } from "../../content/display/display-catalog";
import type { CharacterCatalog } from "../../content/master-data/character-catalog";
import { GachaType, type GachaCatalog, type GachaDefinition } from "../../content/master-data/gacha-catalog";
import type { Clock } from "../../infrastructure/clock/clock";
import type { AdjustableSystemClock } from "../../infrastructure/clock/adjustable-system-clock";
import type { GachaProbabilityService } from "../gacha-probability/gacha-probability.service";
import { applyGachaPoolPolicy, gachaProbabilityProfile, type GachaPoolSelection } from "../gacha/gacha-pool-policy";
import type { RuntimeGachaSlot } from "../gacha/seasonal-gacha.models";
import type { PlayerDataService } from "../player-data/player-data.service";
import type { AdminGachaBanner, AdminWebRepository } from "./admin-web.repository";
import type { BeadCurrency, BeadOperation } from "./admin-web.repository";

export interface AdminWebOptions {
    webDir: string;
    importEnabled: boolean;
    adjustableClock: AdjustableSystemClock | null;
    characterCatalog: CharacterCatalog;
    gachaCatalog: GachaCatalog;
    displayCatalog: DisplayCatalog;
}

const GACHA_SLOTS = ["base", "new", "rerun", "elemental", "weapon", "meteor-1", "meteor-2", "anniversary", "seasonal"] as const;
const MAX_ARTWORK_BYTES = 8 * 1024 * 1024;

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character] ?? character);
}

function parsePlayerId(raw: string): number | null {
    const value = Number(raw);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function parsePositiveInt(raw: string): number | null {
    const value = Number(raw);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function parseNonNegativeInt(raw: string): number | null {
    const value = Number(raw);
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parseGachaSlot(raw: string): RuntimeGachaSlot | null {
    if ((GACHA_SLOTS as readonly string[]).includes(raw)) return raw as RuntimeGachaSlot;
    return /^custom-[1-9]\d*$/.test(raw) ? raw as RuntimeGachaSlot : null;
}

function parseBeadUpdate(value: unknown): {
    currency: BeadCurrency;
    operation: BeadOperation;
    amount: number;
} | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const body = value as Record<string, unknown>;
    const currency = body.currency;
    const operation = body.operation;
    const amount = body.amount;
    if ((currency !== "paid" && currency !== "free")
        || (operation !== "set" && operation !== "add")
        || typeof amount !== "number"
        || !Number.isSafeInteger(amount)
        || (operation === "set" && amount < 0)) return null;
    return { currency, operation, amount };
}

interface ParsedPoolUpdate {
    definition: GachaDefinition;
    featuredIds: number[];
}

interface AdminPoolCatalogItem {
    id: number;
    name: string;
    rarity: 5 | 4 | 3;
    element: number | null;
    elementName: string;
}

const ELEMENT_NAMES = ["Fire", "Water", "Thunder", "Wind", "Light", "Dark"] as const;

function safeJson(value: unknown): string {
    return JSON.stringify(value)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}

function poolCatalogFor(
    current: GachaDefinition,
    characterCatalog: CharacterCatalog,
    gachaCatalog: GachaCatalog,
    displayCatalog: DisplayCatalog,
): AdminPoolCatalogItem[] {
    if (current.type === GachaType.CHARACTER) {
        return characterCatalog.listAll()
            .filter((entry) => entry.rarity === 5 || entry.rarity === 4 || entry.rarity === 3)
            .map((entry) => ({
                id: entry.id,
                name: displayCatalog.find("character", entry.id).name,
                rarity: entry.rarity as 5 | 4 | 3,
                element: entry.element,
                elementName: ELEMENT_NAMES[entry.element] ?? `Element ${entry.element}`,
            }))
            .sort((a, b) => b.rarity - a.rarity || a.element - b.element || a.id - b.id);
    }

    const items = new Map<number, 5 | 4 | 3>();
    for (const definition of gachaCatalog.listAll()) {
        if (definition.type !== GachaType.WEAPON) continue;
        for (const item of Object.values(definition.pool).flat()) {
            if (item.rank === 5 || item.rank === 4 || item.rank === 3) {
                items.set(item.id, item.rank as 5 | 4 | 3);
            }
        }
    }
    return [...items.entries()]
        .map(([id, rarity]) => ({
            id,
            name: displayCatalog.find("equipment", id).name,
            rarity,
            element: null,
            elementName: "—",
        }))
        .sort((a, b) => b.rarity - a.rarity || a.id - b.id);
}

function parsePoolUpdate(
    value: unknown,
    current: GachaDefinition,
    festival: boolean,
    catalog: readonly AdminPoolCatalogItem[],
): ParsedPoolUpdate | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const rawEntries = (value as Record<string, unknown>).entries;
    if (!Array.isArray(rawEntries) || rawEntries.length === 0 || rawEntries.length > 2_000) return null;

    const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));
    const selections: GachaPoolSelection[] = [];
    const ids = new Set<number>();
    for (const rawEntry of rawEntries) {
        if (typeof rawEntry !== "object" || rawEntry === null || Array.isArray(rawEntry)) return null;
        const entry = rawEntry as Record<string, unknown>;
        const id = entry.id;
        const featured = entry.featured;
        if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0
            || typeof featured !== "boolean" || ids.has(id)) return null;
        const metadata = catalogById.get(id);
        if (!metadata) return null;
        ids.add(id);
        selections.push({ id, rank: metadata.rarity, featured });
    }

    if (([5, 4, 3] as const).some((rarity) => !selections.some((entry) => entry.rank === rarity))) {
        return null;
    }

    return {
        definition: applyGachaPoolPolicy(current, selections, festival && current.type === GachaType.CHARACTER),
        featuredIds: selections.filter((entry) => entry.featured).map((entry) => entry.id),
    };
}

function slotLabel(slot: RuntimeGachaSlot): string {
    if (slot === "base") return "BASE";
    if (slot === "new") return "NEW";
    if (slot === "rerun") return "RERUN";
    if (slot === "elemental") return "ELEMENTAL";
    if (slot === "weapon") return "WEAPON";
    if (slot === "meteor-1") return "METEOR FES I";
    if (slot === "meteor-2") return "METEOR FES II";
    if (slot === "anniversary") return "ANNIVERSARY";
    if (slot === "seasonal") return "SEASONAL";
    const customId = slot.slice("custom-".length);
    return `CUSTOM ${customId}`;
}

function formatRate(value: number): string {
    return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function profileLabel(profile: ReturnType<typeof gachaProbabilityProfile>): string {
    if (profile === "meteor-festival") return "Meteor Festival";
    if (profile === "featured") return "Featured Banner";
    return "Normal Banner";
}

function renderArtwork(banner: AdminGachaBanner): string {
    if (!banner.artworkPath) {
        return `<div class="gacha-artwork-placeholder">No artwork</div>`;
    }
    return `<img src="${escapeHtml(banner.artworkPath)}" alt="${escapeHtml(slotLabel(banner.slot))} artwork" class="gacha-artwork">`;
}

function removeArtworkFile(publicDir: string, artworkPath: string | null): void {
    if (!artworkPath?.startsWith("/public/uploads/gacha/")) return;
    const relative = artworkPath.slice("/public/".length);
    const target = path.resolve(publicDir, relative);
    const uploadRoot = path.resolve(publicDir, "uploads", "gacha");
    if (!target.startsWith(`${uploadRoot}${path.sep}`)) return;
    if (existsSync(target)) unlinkSync(target);
}

function decodeArtwork(value: unknown): { extension: string; bytes: Buffer } | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const dataUrl = (value as Record<string, unknown>).dataUrl;
    if (typeof dataUrl !== "string") return null;
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) return null;
    const extension = match[1] === "jpeg" ? "jpg" : match[1];
    const bytes = Buffer.from(match[2] ?? "", "base64");
    if (bytes.length === 0 || bytes.length > MAX_ARTWORK_BYTES) return null;
    return { extension, bytes };
}

export function createAdminWebRoutes(
    repository: AdminWebRepository,
    playerData: PlayerDataService,
    gachaProbability: GachaProbabilityService,
    clock: Clock,
    options: AdminWebOptions,
): FastifyPluginAsync {
    const pagesDir = path.join(options.webDir, "pages");
    const publicDir = path.join(options.webDir, "public");
    const uploadDir = path.join(publicDir, "uploads", "gacha");
    const page = (name: string): string => readFileSync(path.join(pagesDir, name), "utf8");

    return async (fastify) => {
        await fastify.register(fastifyStatic, {
            root: publicDir,
            prefix: "/public/",
            decorateReply: false,
        });

        fastify.get("/", async (_request, reply) => {
            const currentServerTime = clock.now().toISOString().replace(/\.\d{3}Z$/, "");
            return reply.type("text/html; charset=utf-8")
                .send(page("index.html").replace("{{currentServerTime}}", currentServerTime));
        });

        fastify.get("/gacha", async (_request, reply) => {
            const now = clock.now();
            // Materialize the seasonal cycle before the admin repository reads it.
            gachaProbability.activeManifest(now);
            const banners = repository.listCurrentGachas(now);
            const content = banners.length === 0
                ? `<section class="empty-card"><h3>No current gacha banners found.</h3></section>`
                : banners.map((banner) => {
                    const probability = gachaProbability.presentBanner(banner);
                    const featuredNames = probability.entries
                        .filter((entry) => entry.featured)
                        .map((entry) => entry.name)
                        .slice(0, 4);
                    const featured = featuredNames.length > 0
                        ? featuredNames.map(escapeHtml).join(", ")
                        : "None";
                    const profile = gachaProbabilityProfile(
                        banner.festival,
                        probability.entries.map((entry) => ({ featured: entry.featured })),
                    );
                    const state = banner.enabled ? "Active" : "Disabled";
                    const action = banner.enabled
                        ? `<button type="button" class="secondary-button delete-gacha" data-season="${banner.seasonNumber}" data-cycle="${banner.cycleIndex}" data-slot="${banner.slot}">Delete</button>`
                        : `<button type="button" class="primary-button restore-gacha" data-season="${banner.seasonNumber}" data-cycle="${banner.cycleIndex}" data-slot="${banner.slot}">Add / Restore</button>`;
                    return `<li class="gacha-card ${banner.enabled ? "" : "is-disabled"}">
                        <div class="gacha-card-art">${renderArtwork(banner)}</div>
                        <section class="gacha-card-body">
                            <div class="gacha-card-heading">
                                <div>
                                    <p class="eyebrow">${escapeHtml(slotLabel(banner.slot))} · Gacha #${banner.shellGachaId}</p>
                                    <h3>${escapeHtml(slotLabel(banner.slot))} Pool</h3>
                                </div>
                                <span class="state-pill">${escapeHtml(profileLabel(profile))} · ${state}</span>
                            </div>
                            <p class="muted">Season ${banner.seasonNumber}, cycle ${banner.cycleIndex} · ${escapeHtml(banner.startsAt.toISOString())} → ${escapeHtml(banner.endsAt.toISOString())}</p>
                            <div class="rate-strip">
                                <span>5★ <strong>${formatRate(probability.rarityRatesPercent["5"] ?? 0)}%</strong></span>
                                <span>4★ <strong>${formatRate(probability.rarityRatesPercent["4"] ?? 0)}%</strong></span>
                                <span>3★ <strong>${formatRate(probability.rarityRatesPercent["3"] ?? 0)}%</strong></span>
                            </div>
                            <p class="muted">Featured: ${featured}</p>
                            <div class="card-actions">
                                <a class="primary-button" href="/gacha/${banner.seasonNumber}/${banner.cycleIndex}/${banner.slot}">Edit pool</a>
                                ${action}
                            </div>
                        </section>
                    </li>`;
                }).join("");

            const disabled = banners.filter((banner) => !banner.enabled);
            const restoreOptions = disabled.length === 0
                ? `<option value="">All seasonal slots are already active</option>`
                : disabled.map((banner) => `<option value="${banner.seasonNumber}:${banner.cycleIndex}:${banner.slot}">${escapeHtml(slotLabel(banner.slot))} · Gacha #${banner.shellGachaId}</option>`).join("");
            return reply.type("text/html; charset=utf-8").send(
                page("gacha.html")
                    .replace("{{listContent}}", content)
                    .replace("{{restoreOptions}}", restoreOptions),
            );
        });

        fastify.get<{ Params: { season: string; cycle: string; slot: string } }>(
            "/gacha/:season/:cycle/:slot",
            async (request, reply) => {
                const season = parsePositiveInt(request.params.season);
                const cycle = parseNonNegativeInt(request.params.cycle);
                const slot = parseGachaSlot(request.params.slot);
                if (season === null || cycle === null || slot === null) return reply.redirect("/gacha");
                const banner = repository.findGacha(season, cycle, slot);
                if (!banner) return reply.redirect("/gacha");
                const probability = gachaProbability.presentBanner(banner);
                const catalog = poolCatalogFor(
                    banner.definition,
                    options.characterCatalog,
                    options.gachaCatalog,
                    options.displayCatalog,
                );
                const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));
                const selections: GachaPoolSelection[] = probability.entries.map((entry) => ({
                    id: entry.id,
                    rank: entry.rarity as 5 | 4 | 3,
                    featured: entry.featured,
                }));
                const profile = gachaProbabilityProfile(banner.festival, selections);
                const rows = (rarity: 5 | 4 | 3): string => probability.entries
                    .filter((entry) => entry.rarity === rarity)
                    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.ratePercent - a.ratePercent || a.id - b.id)
                    .map((entry) => {
                        const metadata = catalogById.get(entry.id);
                        return `<tr class="pool-row" data-id="${entry.id}" data-rarity="${rarity}" data-featured="${entry.featured}">
                            <td>${entry.id}</td>
                            <td class="pool-name">${escapeHtml(entry.name)}</td>
                            <td>${escapeHtml(metadata?.elementName ?? "—")}</td>
                            <td><input class="pool-rate readonly-rate" type="text" value="${formatRate(entry.ratePercent)}%" readonly></td>
                            <td class="featured-cell">${entry.featured ? "Featured" : "—"}</td>
                        </tr>`;
                    }).join("");
                const html = page("gacha-detail.html")
                    .replace(/{{seasonNumber}}/g, String(banner.seasonNumber))
                    .replace(/{{cycleIndex}}/g, String(banner.cycleIndex))
                    .replace(/{{slot}}/g, banner.slot)
                    .replace(/{{slotLabel}}/g, escapeHtml(slotLabel(banner.slot)))
                    .replace(/{{shellGachaId}}/g, String(banner.shellGachaId))
                    .replace("{{state}}", banner.enabled ? "Active" : "Disabled")
                    .replace("{{enabled}}", String(banner.enabled))
                    .replace("{{festival}}", String(banner.festival))
                    .replace("{{profileLabel}}", profileLabel(profile))
                    .replace("{{artwork}}", renderArtwork(banner))
                    .replace("{{rate5}}", formatRate(probability.rarityRatesPercent["5"] ?? 0))
                    .replace("{{rate4}}", formatRate(probability.rarityRatesPercent["4"] ?? 0))
                    .replace("{{rate3}}", formatRate(probability.rarityRatesPercent["3"] ?? 0))
                    .replace("{{rows5}}", rows(5))
                    .replace("{{rows4}}", rows(4))
                    .replace("{{rows3}}", rows(3))
                    .replace("{{catalogJson}}", safeJson(catalog))
                    .replace("{{selectionJson}}", safeJson(selections));
                return reply.type("text/html; charset=utf-8").send(html);
            },
        );

        fastify.get("/player", async (_request, reply) => {
            const players = repository.listPlayers();
            const content = players.length === 0
                ? `<h4 class="text-xl w-full text-center font-bold">No players found</h4>`
                : players.map((player) => `<li class="w-full">
                    <a href="/player/${player.id}" class="p-5 h-full text-on-surface hover:text-primary items-center flex gap-3 border-outline-variant transition-colors border rounded-3xl hover:bg-surface-container-low">
                        <section class="flex flex-col gap-2 flex-1">
                            <h4 class="text-xl font-bold text-inherit transition-colors">${escapeHtml(player.name)}</h4>
                            <h4 class="text-base font-bold text-on-surface-variant">Last Login: ${escapeHtml(player.lastLoginTime.toISOString())}</h4>
                        </section>
                        <section class="flex gap-3 items-center"><p class="text-xl text-on-surface-variant">Player Id</p><h4 class="text-xl font-bold">${player.id}</h4></section>
                    </a></li>`).join("");
            return reply.type("text/html; charset=utf-8")
                .send(page("players.html").replace("{{listContent}}", content));
        });

        fastify.get<{ Params: { playerId: string } }>("/player/:playerId", async (request, reply) => {
            const playerId = parsePlayerId(request.params.playerId);
            const player = playerId === null ? null : repository.findPlayer(playerId);
            if (!player) return reply.redirect("/player");
            const html = page("player.html")
                .replace("{{playerName}}", escapeHtml(player.name))
                .replace("{{playerComment}}", escapeHtml(player.comment))
                .replace(/{{playerId}}/g, String(player.id))
                .replace("{{paidVmoney}}", String(player.paidVmoney))
                .replace("{{freeVmoney}}", String(player.freeVmoney))
                .replace("{{importDisabled}}", options.importEnabled ? "" : "Import is disabled. Set PLAYER_DATA_IMPORT_ENABLED=true.");
            return reply.type("text/html; charset=utf-8").send(html);
        });

        fastify.post<{ Params: { playerId: string } }>("/web_api/player/:playerId/beads", async (request, reply) => {
            const playerId = parsePlayerId(request.params.playerId);
            const update = parseBeadUpdate(request.body);
            if (playerId === null || !update) {
                return reply.code(400).send({ error: "Invalid bead update." });
            }
            const player = repository.updateBeads(
                playerId,
                update.currency,
                update.operation,
                update.amount,
            );
            if (!player) return reply.code(404).send({ error: "Player not found." });
            return {
                player_id: player.id,
                paid_vmoney: player.paidVmoney,
                free_vmoney: player.freeVmoney,
            };
        });

        fastify.put<{ Params: { season: string; cycle: string; slot: string } }>(
            "/web_api/gacha/:season/:cycle/:slot/pool",
            async (request, reply) => {
                const season = parsePositiveInt(request.params.season);
                const cycle = parseNonNegativeInt(request.params.cycle);
                const slot = parseGachaSlot(request.params.slot);
                if (season === null || cycle === null || slot === null) return reply.code(400).send({ error: "Invalid gacha key." });
                const banner = repository.findGacha(season, cycle, slot);
                if (!banner) return reply.code(404).send({ error: "Gacha not found." });
                const catalog = poolCatalogFor(
                    banner.definition,
                    options.characterCatalog,
                    options.gachaCatalog,
                    options.displayCatalog,
                );
                const update = parsePoolUpdate(request.body, banner.definition, banner.festival, catalog);
                if (!update) {
                    return reply.code(400).send({
                        error: "Invalid pool. Select valid content and keep at least one 5★, 4★, and 3★ item. Rates are calculated automatically.",
                    });
                }
                const updated = repository.updateGachaDefinition(season, cycle, slot, update.definition, update.featuredIds);
                if (!updated) return reply.code(404).send({ error: "Gacha not found." });
                return { updated: true, banner: gachaProbability.presentBanner(updated) };
            },
        );

        fastify.delete<{ Params: { season: string; cycle: string; slot: string } }>(
            "/web_api/gacha/:season/:cycle/:slot",
            async (request, reply) => {
                const season = parsePositiveInt(request.params.season);
                const cycle = parseNonNegativeInt(request.params.cycle);
                const slot = parseGachaSlot(request.params.slot);
                if (season === null || cycle === null || slot === null) return reply.code(400).send({ error: "Invalid gacha key." });
                const banner = repository.setGachaEnabled(season, cycle, slot, false);
                if (!banner) return reply.code(404).send({ error: "Gacha not found." });
                return { deleted: true, softDelete: true };
            },
        );

        fastify.post<{ Params: { season: string; cycle: string; slot: string } }>(
            "/web_api/gacha/:season/:cycle/:slot/enable",
            async (request, reply) => {
                const season = parsePositiveInt(request.params.season);
                const cycle = parseNonNegativeInt(request.params.cycle);
                const slot = parseGachaSlot(request.params.slot);
                if (season === null || cycle === null || slot === null) return reply.code(400).send({ error: "Invalid gacha key." });
                const banner = repository.setGachaEnabled(season, cycle, slot, true);
                if (!banner) return reply.code(404).send({ error: "Gacha not found." });
                return { enabled: true };
            },
        );

        fastify.put<{ Params: { season: string; cycle: string; slot: string } }>(
            "/web_api/gacha/:season/:cycle/:slot/artwork",
            async (request, reply) => {
                const season = parsePositiveInt(request.params.season);
                const cycle = parseNonNegativeInt(request.params.cycle);
                const slot = parseGachaSlot(request.params.slot);
                if (season === null || cycle === null || slot === null) return reply.code(400).send({ error: "Invalid gacha key." });
                const banner = repository.findGacha(season, cycle, slot);
                if (!banner) return reply.code(404).send({ error: "Gacha not found." });
                const artwork = decodeArtwork(request.body);
                if (!artwork) return reply.code(400).send({ error: "Artwork must be PNG, JPEG, or WebP and at most 8 MiB." });
                mkdirSync(uploadDir, { recursive: true });
                removeArtworkFile(publicDir, banner.artworkPath);
                const fileName = `${season}-${cycle}-${slot}.${artwork.extension}`;
                writeFileSync(path.join(uploadDir, fileName), artwork.bytes);
                const artworkPath = `/public/uploads/gacha/${fileName}`;
                repository.setGachaArtwork(season, cycle, slot, artworkPath);
                return { artworkPath };
            },
        );

        fastify.delete<{ Params: { season: string; cycle: string; slot: string } }>(
            "/web_api/gacha/:season/:cycle/:slot/artwork",
            async (request, reply) => {
                const season = parsePositiveInt(request.params.season);
                const cycle = parseNonNegativeInt(request.params.cycle);
                const slot = parseGachaSlot(request.params.slot);
                if (season === null || cycle === null || slot === null) return reply.code(400).send({ error: "Invalid gacha key." });
                const banner = repository.findGacha(season, cycle, slot);
                if (!banner) return reply.code(404).send({ error: "Gacha not found." });
                removeArtworkFile(publicDir, banner.artworkPath);
                repository.setGachaArtwork(season, cycle, slot, null);
                return { removed: true };
            },
        );

        fastify.get<{ Params: { playerId: string } }>("/web_api/player/:playerId/save", async (request, reply) => {
            const playerId = parsePlayerId(request.params.playerId);
            if (playerId === null || !repository.findPlayer(playerId)) return reply.code(404).send({ error: "Player not found." });
            reply.header("content-disposition", `attachment; filename="starpoint-player-${playerId}.json"`);
            return reply.type("application/json").send(playerData.exportPlayer(playerId));
        });

        fastify.put<{ Params: { playerId: string } }>("/web_api/player/:playerId/save", async (request, reply) => {
            if (!options.importEnabled) return reply.code(403).send({ error: "Player-save import is disabled." });
            const playerId = parsePlayerId(request.params.playerId);
            if (playerId === null || !repository.findPlayer(playerId)) return reply.code(404).send({ error: "Player not found." });
            return { imported: true, summary: playerData.importPlayer(playerId, request.body) };
        });

        fastify.get<{ Querystring: { time?: string } }>("/web_api/server/time", async (request, reply) => {
            if (!options.adjustableClock) return reply.code(409).send({ error: "The injected clock is not adjustable." });
            const raw = request.query.time;
            const normalized = raw && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)
                ? `${raw}:00.000Z`
                : raw && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)
                    ? `${raw}.000Z`
                    : "";
            const instant = normalized ? new Date(normalized) : new Date(Number.NaN);
            if (Number.isNaN(instant.getTime())) return reply.code(400).send({ error: "Invalid UTC time." });
            options.adjustableClock.set(instant);
            return reply.redirect("/");
        });

        fastify.get("/web_api/server/reset-time", async (_request, reply) => {
            if (!options.adjustableClock) return reply.code(409).send({ error: "The injected clock is not adjustable." });
            options.adjustableClock.reset();
            return reply.redirect("/");
        });
    };
}
