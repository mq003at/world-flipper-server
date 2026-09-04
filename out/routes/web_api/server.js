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
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../utils");
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.get("/resetTime", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // convert string to date
            (0, utils_1.setServerTime)(null);
        }
        catch (error) { }
        return reply.redirect(`/`);
    }));
    fastify.get("/time", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const newTime = request.query.time;
        if (!newTime)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid query parameters."
            });
        try {
            // convert string to date
            const time = new Date(newTime + ".000Z");
            (0, utils_1.setServerTime)(time);
        }
        catch (error) { }
        return reply.redirect(`/`);
    }));
});
exports.default = routes;
