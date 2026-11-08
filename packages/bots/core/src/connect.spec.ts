import { afterEach, describe, expect, test } from "bun:test";

import { joinLobby } from "./connect";

/** What a stand-in for the server's API answers each procedure with. */
type Answers = Record<string, { status: number; body: unknown; headers?: Record<string, string> }>;

/** Where the bot takes a seat, with the tokens that it starts with. */
const seat = (url: string) => ({ url, pin: "123456", tokens: { token: "old", refreshToken: "old-refresh" } });

/** How the server's API says that it refused a call. */
const refused = (message: string) => ({ error: { json: { message } } });

describe("Joining a lobby as a bot", () => {
    let server: ReturnType<typeof Bun.serve> | undefined;
    afterEach(() => server?.stop(true));

    /** Serve the answers, and record each call, with the token that it was made with. */
    function serve(answers: Answers) {
        const calls: string[] = [];
        server = Bun.serve({
            port: 0,
            fetch: (request) => {
                const procedure = new URL(request.url).pathname.replace("/api/trpc/", "");
                calls.push(`${request.method} ${procedure} ${request.headers.get("x-token")}`);
                const { status, body, headers } = answers[procedure]!;
                return Response.json(body, { status, ...(headers && { headers }) });
            },
        });
        return { url: server.url.origin, calls };
    }

    test("takes a seat, with the tokens that the server renewed", async () => {
        const { url, calls } = serve({
            "lobbies.get": {
                status: 401,
                body: refused("UNAUTHORIZED"),
                headers: { "x-token": "new", "x-refresh-token": "new-refresh" },
            },
            "lobbies.join": { status: 200, body: { result: { data: { json: {} } } } },
        });

        expect(await joinLobby(seat(url))).toEqual({ token: "new", refreshToken: "new-refresh" });
        expect(calls).toEqual(["GET lobbies.get old", "POST lobbies.join new"]);
    });

    test("keeps the seat that the bot already has", async () => {
        const { url, calls } = serve({ "lobbies.get": { status: 200, body: { result: { data: { json: {} } } } } });

        expect(await joinLobby(seat(url))).toEqual(seat(url).tokens);
        expect(calls).toEqual(["GET lobbies.get old"]);
    });

    test("says why the server didn't seat it", async () => {
        const { url } = serve({
            "lobbies.get": { status: 401, body: refused("UNAUTHORIZED") },
            "lobbies.join": { status: 400, body: refused("Lobby isn't joinable") },
        });

        await expect(joinLobby(seat(url))).rejects.toThrow("Couldn't join lobby 123456: Lobby isn't joinable");
    });
});
