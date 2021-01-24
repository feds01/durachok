class ServerError extends Error {
    constructor(message: string = 'Internal Server ErrorPage.', ...params: any) {
        // Pass remaining arguments (including vendor specific ones) to parent constructor
        super(...params);

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ServerError);
        }

        this.name = 'ServerError';

        // Custom debugging information
        this.message = message;
    }
}

export default ServerError;
