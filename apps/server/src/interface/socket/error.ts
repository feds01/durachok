import { InvalidGameState } from "@durachok/engine";
import { ErrorMessage } from "@durachok/transport";
import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { InputValidationError } from "zod-sockets";

import { ApiError, transformZodErrorIntoErrorSummary } from "../../utils/error";

/**
 * Convert an error into a message that can be sent to the client.
 *
 * @param error - The error that occurred.
 * @returns A message that can be sent to the client.
 */
export function transformErrorIntoMessage(error: Error): ErrorMessage {
    if (error instanceof InputValidationError) {
        return {
            type: "bad_request",
            message: "That request isn't valid.",
            details: transformZodErrorIntoErrorSummary(error.cause),
        };
    } else if (error instanceof ApiError) {
        return error.toMessage();
    } else if (error instanceof ZodError) {
        return {
            type: "bad_request",
            message: "That request isn't valid.",
            details: transformZodErrorIntoErrorSummary(error),
        };
    } else if (error instanceof InvalidGameState) {
        return { type: "invalid_move", message: error.message };
    } else if (error instanceof TRPCError) {
        // The services report errors as tRPC errors, which the API shares.
        switch (error.code) {
            case "BAD_REQUEST":
                return { type: "bad_request", message: error.message };
            case "UNAUTHORIZED":
            case "FORBIDDEN":
                return { type: "unauthorized", message: error.message };
            case "NOT_FOUND":
                return { type: "not_found", message: error.message };
            case "TOO_MANY_REQUESTS":
                return { type: "too_many_requests", message: error.message };
        }
    }

    // @@Todo: determine which other error types can we transform into
    // a message.

    // The error itself is logged, and what went wrong inside the server isn't the player's to read.
    return {
        type: "internal",
        message: "Something went wrong on the server.",
    };
}
