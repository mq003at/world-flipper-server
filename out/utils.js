"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestPlatformSync = exports.Platform = exports.generateDataHeaders = exports.generateViewerId = exports.generateIdpAlias = exports.getDateFromServerTime = exports.setServerTime = exports.getServerDate = exports.getServerTime = void 0;
const crypto_1 = require("crypto");
// The server's current date.
let serverTime = null;
/**
 * Returns the current server time as a unix epoch.
 *
 * @param date An optional date; The date to get the time of.
 * @returns The unix epoch.
 */
function getServerTime(date = new Date()) {
    return Math.floor((serverTime !== null && serverTime !== void 0 ? serverTime : date).getTime() / 1000); //1710116388//
}
exports.getServerTime = getServerTime;
/**
 * Gets the current server time as a Date.
 *
 * @returns The current server time as a date.
 */
function getServerDate() {
    return serverTime !== null && serverTime !== void 0 ? serverTime : new Date();
}
exports.getServerDate = getServerDate;
function setServerTime(date) {
    serverTime = date;
}
exports.setServerTime = setServerTime;
/**
 * Converts a server time value (unix epoch in seconds) into a Date.
 *
 * @param serverTime The unix epoch value.
 * @returns The date.
 */
function getDateFromServerTime(serverTime) {
    return new Date(serverTime * 1000);
}
exports.getDateFromServerTime = getDateFromServerTime;
/**
 * Generates an IdpAlias to identify a particular device.
 *
 * @param appId
 * @param idpId
 * @param serialNo
 * @returns The generated IdpAlias
 */
function generateIdpAlias(appId, deviceId, serialNo) {
    return `${appId}:${deviceId}:${serialNo}`;
}
exports.generateIdpAlias = generateIdpAlias;
/**
 * Generates a random viewer ID using the crypto library.
 *
 * @returns A number between 100,000,000 and 999,999,999
 */
function generateViewerId() {
    return (0, crypto_1.randomInt)(100000000, 999999999);
}
exports.generateViewerId = generateViewerId;
/**
 * Generates a default data headers object, which is used in communication with the client.
 *
 * @param customValues A partial DataHeaders object with custom fields to replace the default ones.
 * @returns A DataHeaders object.
 */
function generateDataHeaders(customValues = {}, fields = ['force_update', 'asset_update', 'short_udid', 'viewer_id', 'servertime', 'result_code']) {
    const defaultHeaders = {
        force_update: false,
        asset_update: false,
        short_udid: 0,
        viewer_id: 0,
        servertime: getServerTime(), //1651514014,//getServerTime(),
        result_code: 1
    };
    const headers = {};
    for (const field of fields) {
        const customValue = customValues[field];
        const defaultValue = defaultHeaders[field];
        headers[field] = customValue === undefined ? defaultValue : customValue;
    }
    return headers;
}
exports.generateDataHeaders = generateDataHeaders;
var Platform;
(function (Platform) {
    Platform[Platform["ANDROID"] = 0] = "ANDROID";
    Platform[Platform["IOS"] = 1] = "IOS";
})(Platform || (exports.Platform = Platform = {}));
function getRequestPlatformSync(request) {
    // check user agent
    if ((request.headers["user-agent"] || '').includes('iOS;'))
        return Platform.IOS;
    // check requestedby header
    if ((request.headers["requestedby"] || '') === 'ios')
        return Platform.IOS;
    return Platform.ANDROID;
}
exports.getRequestPlatformSync = getRequestPlatformSync;
