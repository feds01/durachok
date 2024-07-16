export class GameInitError implements Error {
    constructor(message = '') {
        // Pass remaining arguments (including vendor specific ones) to parent constructor

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, GameInitError);
        }

        // Custom debugging information
        this.message = message
    }

    message: string;
    name: string = "GameInitError";
}

export default GameInitError;
