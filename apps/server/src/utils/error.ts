import { ErrorSummary } from "@durachok/transport/src/request/socket";
import { ZodError } from "zod";

import { expr } from ".";

/**
 * Function that is used to transform @see ZodError that are returned from any
 * failed @see ZodSchema are transformed into an internal error subject
 *
 * @param error - Any ZodError from a schema
 * @returns A transformed readable error map
 */
export function transformZodErrorIntoErrorSummary<T>(
    error: ZodError<T>,
): ErrorSummary {
    const errorMap = new Map();

    error.errors.forEach((errorItem) => {
        const path = errorItem.path.join(".");

        // Perform some transformation on the ZodError to get into a more readable format
        const responseError = expr(() => {
            switch (errorItem.code) {
                case "invalid_type":
                    return {
                        message: `Expected to receive a '${errorItem.expected}', but got '${errorItem.received}'`,
                    };
                default:
                    return {
                        message: errorItem.message,
                    };
            }
        });

        errorMap.set(path, responseError);

        return {
            message: error.message,
            path: errorItem.path.map((item) => item.toString()),
        };
    });

    return Object.fromEntries(errorMap) as ErrorSummary;
}

/**
 * Various internal error codes that are used to help internal services deal
 * with errors, and to possibly execute some logic based on the error.
 */
export enum InternalApiErrorCode {
    NotFound = "not_found",
    InvalidItem = "invalid_item",
    AccessDenied = "access_denied",

    /**
     * No error code was specified, this is the default error code.
     */
    None = "none",
}

/**
 * Class that is used to represent an error that will be returned to the client.
 *
 */
export class ApiError extends Error {
    /**
     * The HTTP status code that will be returned to the client.
     */
    readonly code: number;

    /**
     * Additional information for internal services to deal with errors, and to
     * possibly execute some logic based on the error.
     */
    readonly internalCode: InternalApiErrorCode;

    /**
     * The error summary that will be returned to the client.
     */
    readonly errors?: ErrorSummary;

    /**
     * Constructor for the ApiError class.
     *
     * @param code - The HTTP status code that will be returned to the client.
     * @param internal - Additional information for internal services to deal with errors, and to possibly execute some logic based on the error.
     * @param message - The error message that will be returned to the client.
     * @param errors - The error summary that will be returned to the client.
     */
    constructor(
        code: number,
        internal: InternalApiErrorCode,
        message: string,
        errors?: ErrorSummary,
    ) {
        super(message);

        this.internalCode = internal;
        this.code = code;
        this.errors = errors;
    }

    static internal(
        code: InternalApiErrorCode,
        message: string,
        errors?: ErrorSummary,
    ) {
        return new ApiError(500, code, message, errors);
    }

    static http(code: number, message: string, errors?: ErrorSummary) {
        return new ApiError(code, InternalApiErrorCode.None, message, errors);
    }
}
