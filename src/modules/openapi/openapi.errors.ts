export interface OpenApiErrorBody {
    error: string
    message: string
}

export class OpenApiHttpError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly errorName: string,
        message: string,
    ) {
        super(message)
        this.name = "OpenApiHttpError"
    }

    toBody(): OpenApiErrorBody {
        return {
            error: this.errorName,
            message: this.message,
        }
    }

    static badRequest(message: string): OpenApiHttpError {
        return new OpenApiHttpError(400, "Bad Request", message)
    }

    static internal(message: string): OpenApiHttpError {
        return new OpenApiHttpError(500, "Internal Server Error", message)
    }
}
