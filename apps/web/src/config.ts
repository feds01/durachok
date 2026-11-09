import { z } from "zod";

import packageJson from "../../../package.json";

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
 * The web app's configuration, read from the environment that Vite hands over. The API's
 * address, which may be empty for the web app's own origin, comes out as an absolute URL,
 * @see parseApiUrl, and the socket server's is the root of its origin.
 */
function envSchema(origin: string) {
    return z
        .object({
            NODE_ENV: z.string().default("dev"),
            REACT_APP_NAME: z.string().default(packageJson.name),
            REACT_APP_DEV_VERSION: z.string().default(""),
            REACT_APP_VERSION: z.string().default(packageJson.version),
            REACT_APP_BRANCH: z.string().default(""),
            REACT_APP_API_URL: z
                .string()
                .default("")
                .transform((value, ctx) => {
                    try {
                        return parseApiUrl(value || "/api/trpc", origin);
                    } catch (error: unknown) {
                        ctx.addIssue({
                            code: "custom",
                            message: error instanceof Error ? error.message : String(error),
                        });
                        return z.NEVER;
                    }
                }),
            /** Google reCAPTCHA's site key, which is public, for the widget; empty turns reCAPTCHA off. */
            REACT_APP_RE_CAPTCHA_SITE_KEY: z.string().default(""),
        })
        .transform((env) => ({
            APP_ENV: env.NODE_ENV,
            APP_NAME: env.REACT_APP_NAME,
            APP_DEV_VERSION: env.REACT_APP_DEV_VERSION,
            APP_VERSION: env.REACT_APP_VERSION,
            APP_VERSION_BRANCH: env.REACT_APP_BRANCH,
            API_URL: env.REACT_APP_API_URL,
            SOCKET_URL: new URL(env.REACT_APP_API_URL).origin,
            RE_CAPTCHA_SITE_KEY: env.REACT_APP_RE_CAPTCHA_SITE_KEY,
        }));
}

/** The configuration of the application, @see readConfig. */
export type Config = z.output<ReturnType<typeof envSchema>>;

/**
 * Read the web app's configuration from its environment. A wrong one stops the app as it
 * starts, with everything that's wrong with it, rather than with a request that fails later.
 */
export function readConfig(env: Record<string, unknown>, origin: string): Config {
    const result = envSchema(origin).safeParse(env);
    if (!result.success) {
        throw new Error(`The web app's environment isn't right:\n${z.prettifyError(result.error)}`);
    }
    return result.data;
}

/** The configuration of the application. Outside a browser, as in the tests, there's no page to take the origin from. */
export const config = readConfig(import.meta.env, globalThis.location?.origin ?? "http://localhost");

export const {
    APP_ENV,
    APP_NAME,
    APP_DEV_VERSION,
    APP_VERSION,
    APP_VERSION_BRANCH,
    API_URL,
    SOCKET_URL,
    RE_CAPTCHA_SITE_KEY,
} = config;
