import fastifyStatic from "@fastify/static";
import type { FastifyPluginAsync } from "fastify";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Clock } from "../../infrastructure/clock/clock";
import type { AdjustableSystemClock } from "../../infrastructure/clock/adjustable-system-clock";
import type { PlayerDataService } from "../player-data/player-data.service";
import type { AdminWebRepository } from "./admin-web.repository";
import type { BeadCurrency, BeadOperation } from "./admin-web.repository";

export interface AdminWebOptions {
    webDir: string;
    importEnabled: boolean;
    adjustableClock: AdjustableSystemClock | null;
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character] ?? character);
}

function parsePlayerId(raw: string): number | null {
    const value = Number(raw);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
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

export function createAdminWebRoutes(
    repository: AdminWebRepository,
    playerData: PlayerDataService,
    clock: Clock,
    options: AdminWebOptions,
): FastifyPluginAsync {
    const pagesDir = path.join(options.webDir, "pages");
    const publicDir = path.join(options.webDir, "public");
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
