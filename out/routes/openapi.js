"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
// Compatibility shim: keep the old import path used by server.ts while the
// implementation lives in a feature module.
var openapi_routes_1 = require("../modules/openapi/openapi.routes");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(openapi_routes_1).default; } });
