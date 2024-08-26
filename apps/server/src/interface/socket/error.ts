import { ErrorMessage } from "@durachok/transport/src/request/socket";
import { ZodError } from "zod";
import { InputValidationError } from "zod-sockets";

import { transformZodErrorIntoErrorSummary } from "../../utils/error";

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
            message: `invalid event ${error.name} sent`,
            details: transformZodErrorIntoErrorSummary(error.originalError),
        };
    } else if (error instanceof ZodError) {
        return {
            type: "bad_request",
            details: transformZodErrorIntoErrorSummary(error),
        };
    }

    // @@Todo: determine which other error types can we transform into
    // a message.

    return {
        type: "internal",
        message: error.message,
    };
}
