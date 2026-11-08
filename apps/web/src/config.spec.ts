import { describe, expect, test } from "bun:test";

import { parseApiUrl } from "./config";

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
