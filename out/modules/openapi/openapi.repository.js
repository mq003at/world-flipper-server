"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiRepository = void 0;
const types_1 = require("../../data/types");
const wdfpData_1 = require("../../data/wdfpData");
exports.openApiRepository = {
    getSession: wdfpData_1.getSession,
    deleteSession: wdfpData_1.deleteSession,
    getAccount: wdfpData_1.getAccount,
    getAccountFromIdpId: wdfpData_1.getAccountFromIdpIdSync,
    insertAccount: wdfpData_1.insertAccount,
    updateAccount: wdfpData_1.updateAccount,
    insertSession: wdfpData_1.insertSession,
    deleteAccountSessionsOfType: wdfpData_1.deleteAccountSessionsOfType,
    sessionType: types_1.SessionType,
};
