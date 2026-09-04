"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenApiHttpError = void 0;
class OpenApiHttpError extends Error {
    constructor(statusCode, errorName, message) {
        super(message);
        this.statusCode = statusCode;
        this.errorName = errorName;
        this.name = "OpenApiHttpError";
    }
    toBody() {
        return {
            error: this.errorName,
            message: this.message,
        };
    }
    static badRequest(message) {
        return new OpenApiHttpError(400, "Bad Request", message);
    }
    static internal(message) {
        return new OpenApiHttpError(500, "Internal Server Error", message);
    }
}
exports.OpenApiHttpError = OpenApiHttpError;
