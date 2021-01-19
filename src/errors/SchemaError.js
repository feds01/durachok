class SchemaError extends Error {
    constructor(message = 'Invalid parameters', schemaErrors, ...params) {
        // Pass remaining arguments (including vendor specific ones) to parent constructor
        super(...params)

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SchemaError)
        }

        this.name = 'ServerError'

        // Custom debugging information
        this.message = message;
        this.errors = schemaErrors;
    }
}

export default SchemaError;
