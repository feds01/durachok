import { Buffer } from "buffer";
import { SuperJSON } from "superjson";

/**
 * How the API's data is written and read, the same at both ends: as superjson, which keeps
 * what JSON can't, such as dates, and sends a `Buffer`, such as a new avatar's bytes, as base64.
 */
export const transformer = new SuperJSON();

transformer.registerCustom<Buffer, string>(
    {
        isApplicable: (value): value is Buffer => Buffer.isBuffer(value),
        serialize: (value) => value.toString("base64"),
        deserialize: (value) => Buffer.from(value, "base64"),
    },
    "buffer",
);
