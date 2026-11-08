import packageJson from "../../../package.json";

/** Git & App version metadata. */
export const APP_ENV = import.meta.env.NODE_ENV ?? "dev";
export const APP_NAME = import.meta.env.REACT_APP_NAME ?? packageJson.name;
export const APP_DEV_VERSION = import.meta.env.REACT_APP_DEV_VERSION ?? "";
export const APP_VERSION = import.meta.env.REACT_APP_VERSION ?? packageJson.version;
export const APP_VERSION_BRANCH = import.meta.env.REACT_APP_BRANCH ?? "";

/**
 * Read the API's address: an absolute http(s) URL, or a path on the web app's own origin,
 * such as `/api/trpc`, which the web server passes on to the API. Anything else, such as
 * `localhost:8080`, which a browser reads as a URL with the scheme `localhost:`, would make
 * every request fail without a word, so it stops the app with an error instead.
 */
export function parseApiUrl(value: string, origin: string): string {
    const url = value.startsWith("/") ? new URL(value, origin) : URL.canParse(value) ? new URL(value) : null;
    if (url?.protocol !== "http:" && url?.protocol !== "https:") {
        throw new Error(
            `REACT_APP_API_URL must be a path such as /api/trpc, or an absolute http(s) URL such as http://localhost:8080/api/trpc, not "${value}".`,
        );
    }

    return url.href;
}

/**
 * API Endpoint. An empty value, as `.env.sample` has, means the web app's own origin, whose
 * server passes the API on, so that a single address serves the whole app, e.g. through a tunnel.
 */
export const API_URL = parseApiUrl(
    import.meta.env.REACT_APP_API_URL || "/api/trpc",
    // Outside a browser, as in the tests, there's no page to take the origin from.
    globalThis.location?.origin ?? "http://localhost",
);
/** The socket server, which serves the API too, at the root of its origin. */
export const SOCKET_URL = new URL(API_URL).origin;

/** Google ReCAPTCHA v3 secret key. */
export const RE_CAPTCHA_SECRET = import.meta.env.REACT_APP_RE_CAPTCHA_SECRET ?? "";

/** The configuration of the application. */
export const config = {
    APP_ENV,
    APP_NAME,
    APP_DEV_VERSION,
    APP_VERSION,
    API_URL,
    SOCKET_URL,
    RE_CAPTCHA_SECRET,
} as const;

// @@Todo: add a `zod` schema that can validate on boot-up that
// the environment is correctly configured.
export type Config = typeof config;
