import packageJson from "../../../package.json";

/** Git & App version metadata. */
export const APP_ENV = import.meta.env.NODE_ENV ?? "dev";
export const APP_NAME = import.meta.env.REACT_APP_NAME ?? packageJson.name;
export const APP_DEV_VERSION = import.meta.env.REACT_APP_DEV_VERSION ?? "";
export const APP_VERSION =
    import.meta.env.REACT_APP_VERSION ?? packageJson.version;
export const APP_VERSION_BRANCH = import.meta.env.REACT_APP_BRANCH ?? "";

/** API Endpoint */
export const API_URL =
    import.meta.env.REACT_APP_API_URL ?? "http://localhost:5000/api/trpc";
export const SOCKET_URL =
    import.meta.env.REACT_APP_API_URL ?? "http://localhost:5000";

/** Google ReCAPTCHA v3 secret key. */
export const RE_CAPTCHA_SECRET =
    import.meta.env.REACT_APP_RE_CAPTCHA_SECRET ?? "";

/** The configuration of the application. */
const config = {
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
