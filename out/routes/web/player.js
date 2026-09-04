"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const _1 = require(".");
const wdfpData_1 = require("../../data/wdfpData");
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.get("/", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        let html = (0, fs_1.readFileSync)(path_1.default.join(__dirname, _1.staticPagesDir, "players.html")).toString("utf-8");
        const players = (0, wdfpData_1.getAllPlayersSync)();
        let listContent = '';
        if (players.length === 0) {
            listContent = `<h4 class="text-xl w-full text-center font-bold">No players found</h4>
            <h4 class="text-xl w-full text-center font-bold">Connect to Starpoint with a client and sign in as a guest</h4>`;
        }
        else {
            for (const player of players) {
                const id = player.id;
                listContent += `<li class="w-full">
                    <a href="/player/${id}"
                        class="p-5 h-full text-on-surface hover:text-primary items-center flex gap-3 border-outline-variant transition-colors border rounded-3xl hover:bg-surface-container-low">
                        <section class="flex flex-col gap-2 flex-1">
                            <h4 class="text-xl font-bold text-inherit transition-colors">${player.name}</h4>
                            <h4 class="text-base font-bold text-on-surface-variant">Last Login: ${player.lastLoginTime.toDateString()}</h4>
                        </section>
                        
                        <section class="flex gap-3 items-center">
                            <p class="text-xl text-on-surface-variant w-full">Player Id</p>
                            <h4 class="text-xl font-bold text-inherit transition-colors">${id}</h4>
                        </section>
                    </a>
                </li>`;
            }
        }
        html = html.replace("{{listContent}}", listContent);
        reply.header("content-type", "text/html; charset=utf-8");
        reply.send(html);
    }));
    fastify.get("/:playerId", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { playerId } = request.params;
        const { error } = request.query;
        const parsedPlayerId = Number(playerId);
        if (isNaN(parsedPlayerId))
            return reply.redirect("/player");
        const player = (0, wdfpData_1.getPlayerSync)(parsedPlayerId);
        if (player === null)
            return reply.redirect("/player");
        let html = (0, fs_1.readFileSync)(path_1.default.join(__dirname, _1.staticPagesDir, "player.html")).toString("utf-8");
        html = html.replace("{{playerName}}", player.name)
            .replace("{{playerComment}}", player.comment)
            .replace(/{{playerId}}/g, String(parsedPlayerId))
            .replace("{{uploadError}}", error === undefined ? '' : `<h3 class="text-xl text-error font-semibold mt-2">${error}</h3>`);
        reply.header("content-type", "text/html; charset=utf-8");
        reply.send(html);
    }));
});
exports.default = routes;
