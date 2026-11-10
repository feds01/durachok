import { describe, expect, test } from "bun:test";

import { parseApiUrl, readConfig } from "./config";

const origin = "https://durachok.example";

describe("parseApiUrl", () => {
    test("accepts absolute http(s) URLs", () => {
        expect(parseApiUrl("http://localhost:8080/api/trpc", origin)).toBe("http://localhost:8080/api/trpc");
        expect(parseApiUrl("https://api.example/api/trpc", origin)).toBe("https://api.example/api/trpc");
    });

    test("reads a path as one on the web app's own origin", () => {
        expect(parseApiUrl("/api/trpc", origin)).toBe("https://durachok.example/api/trpc");
    });

    test("rejects an address without a scheme, which browsers read as one", () => {
        expect(() => parseApiUrl("localhost:8080", origin)).toThrow('not "localhost:8080"');
    });

    test("rejects other schemes", () => {
        expect(() => parseApiUrl("ftp://localhost/api/trpc", origin)).toThrow("REACT_APP_API_URL");
    });
});

describe("readConfig", () => {
    test("fills in what the environment leaves out", () => {
        const config = readConfig({}, origin);
        expect(config.API_URL).toBe("https://durachok.example/api/trpc");
        expect(config.SOCKET_URL).toBe("https://durachok.example");
        expect(config.RE_CAPTCHA_SECRET).toBe("");
    });

    test("stops with what's wrong with the environment", () => {
        expect(() => readConfig({ REACT_APP_API_URL: "localhost:8080", REACT_APP_VERSION: 2 }, origin)).toThrow(
            /REACT_APP_API_URL[\s\S]*REACT_APP_VERSION|REACT_APP_VERSION[\s\S]*REACT_APP_API_URL/,
        );
    });
});
