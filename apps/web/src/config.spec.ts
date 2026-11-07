import { describe, expect, test } from "bun:test";

import { parseApiUrl } from "./config";

describe("parseApiUrl", () => {
    test("accepts absolute http(s) URLs", () => {
        expect(parseApiUrl("http://localhost:8080/api/trpc")).toBe("http://localhost:8080/api/trpc");
        expect(parseApiUrl("https://durachok.example/api/trpc")).toBe("https://durachok.example/api/trpc");
    });

    test("rejects an address without a scheme, which browsers read as one", () => {
        expect(() => parseApiUrl("localhost:8080")).toThrow('not "localhost:8080"');
    });

    test("rejects a path, and other schemes", () => {
        expect(() => parseApiUrl("/api/trpc")).toThrow("REACT_APP_API_URL");
        expect(() => parseApiUrl("ftp://localhost/api/trpc")).toThrow("REACT_APP_API_URL");
    });
});
