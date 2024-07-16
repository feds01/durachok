export class InvalidGameState implements Error {
    constructor(message = '') {
        // Pass remaining arguments (including vendor specific ones) to parent constructor

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, InvalidGameState);
        }

        // Custom debugging information
        this.message = message
    }

    message: string;
    name: string = "InvalidGameState";
}

export default InvalidGameState;
