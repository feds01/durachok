import winston, { createLogger, format, transports } from "winston";

const { combine, splat, timestamp, printf } = format;

const LogLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
    },
    colors: {
        error: "bold red",
        warn: "yellow",
        info: "blue",
        debug: "green",
    },
};

/**
 * Custom winston format for logging information
 * */
const lobbyFormat = printf(
    ({
        level,
        message,
        timestamp,
        ...metadata
    }: winston.Logform.TransformableInfo) => {
        let msg = `${timestamp} [${level}]: ${message} `;

        if (metadata && metadata.pin && metadata.event) {
            const { pin, event, ...rest } = metadata;

            // Format the message to display timestamp, log level, lobby pin and event handler with message
            msg = `${timestamp} [${level}] [${pin}/${event}]: ${message}`;

            // Append any additional metadata that was passed to the formatter
            if (Object.keys(rest).length > 0) {
                msg += ` meta=${JSON.stringify(rest)}`;
            }
        } else if (Object.keys(metadata).length > 0) {
            msg += JSON.stringify(metadata);
        }

        return msg;
    },
);

const logger = createLogger({
    level: "info",
    levels: LogLevels.levels,
    format: combine(format.colorize(), splat(), timestamp(), lobbyFormat),
    transports: [
        new transports.Console({ level: "info" }),

        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `combined.log`
        //
        // new winston.transports.File({filename: 'error.log', level: 'error'}),
        // new winston.transports.File({filename: 'combined.log'}),
    ],
});

winston.addColors(LogLevels.colors);

export default logger;
