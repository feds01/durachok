import { SOCKET_EVENT_LIMIT } from "../config";
import { RateLimiter } from "./rate-limit";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/**
 * How much one client may do, and how much may be done to one lobby, before the server refuses
 * more for a while. They are generous for a person, and stop a script from guessing, scanning or
 * flooding. A client is a player, by their tokens, or an address, @see TRUST_PROXY.
 */
export const limits = {
    /** Socket events from one player, over all of their connections: a quick game sends a few a second. */
    events: new RateLimiter(SOCKET_EVENT_LIMIT, 5 * SECOND),
    /** Chat messages from one player in a lobby. */
    chat: new RateLimiter(5, 10 * SECOND),
    /** Lobbies looked up by pin from one address, which would otherwise let a script find every lobby. */
    lookups: new RateLimiter(60, MINUTE),
    /** Joins that failed from one address: a lobby that isn't there or is full, a taken name, a wrong passphrase. */
    failedJoins: new RateLimiter(10, MINUTE),
    /** Wrong passphrases sent to one lobby from anywhere, so that many addresses can't guess it together. */
    wrongPassphrases: new RateLimiter(20, MINUTE),
    /** Logins that failed from one address, which would otherwise let a script guess passwords. */
    failedLogins: new RateLimiter(10, MINUTE),
    /** Accounts made from one address. */
    registrations: new RateLimiter(5, 10 * MINUTE),
    /** Avatars that one user uploads. */
    avatars: new RateLimiter(5, 10 * MINUTE),
};

/** How many lobbies one user may keep at once. */
export const MAX_LOBBIES_PER_OWNER = 50;

/** How many of its newest chat messages a lobby keeps. */
export const CHAT_HISTORY = 100;
