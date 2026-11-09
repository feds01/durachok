import { createContext } from "../context";
import logger from "../../lib/logger";

/** The services that the socket's handlers use: one set of them, for the whole server. */
export const context = createContext(logger);
