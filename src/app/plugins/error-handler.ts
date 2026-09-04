import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
    InvalidCredentialsError,
    InvalidRequestError,
    InvariantError,
} from "../../shared/errors/application-error";

/** Install the application error mapping on the root Fastify context. */
export function registerErrorHandler(fastify: FastifyInstance): void {
    fastify.setErrorHandler((error, _request, reply) => {
        if (error instanceof InvalidRequestError || error instanceof InvalidCredentialsError) {
            reply.status(400).send({
                error: "Bad Request",
                message: error.message,
            });
            return;
        }

        if (error instanceof InvariantError) {
            fastify.log.error(error);
            reply.status(500).send({
                error: "Internal Server Error",
                message: error.message,
            });
            return;
        }

        fastify.log.error(error);
        reply.status(500).send({
            error: "Internal Server Error",
            message: "Unexpected server error.",
        });
    });
}

export const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
    registerErrorHandler(fastify);
};
