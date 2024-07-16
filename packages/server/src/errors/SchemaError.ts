class SchemaError extends Error {
    public errors?: Object;

    constructor(message: string = 'Invalid parameters', schemaErrors: {}, ...params: any) {
        // Pass remaining arguments (including vendor specific ones) to parent constructor
        super(...params)

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SchemaError)
        }

        this.name = 'ServerError'

        // Custom debugging information
        this.message = message;

        // @ts-ignore
        this.errors = schemaErrors;
    }
}

export default SchemaError;
