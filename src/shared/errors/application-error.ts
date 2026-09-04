export class InvalidRequestError extends Error {
    constructor(message = "Invalid request body.") {
        super(message);
        this.name = "InvalidRequestError";
    }
}

export class InvalidCredentialsError extends Error {
    constructor(message = "Invalid credentials.") {
        super(message);
        this.name = "InvalidCredentialsError";
    }
}

export class InvariantError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvariantError";
    }
}
