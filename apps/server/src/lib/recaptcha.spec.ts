import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

import { SITEVERIFY_URL, verifyReCaptcha } from "./recaptcha";

/** Answer each request to Google as given, and keep the requests. */
function answerWith(answer: unknown, status = 200) {
    return spyOn(globalThis, "fetch").mockResolvedValue(Response.json(answer, { status }));
}

afterEach(() => {
    mock.restore();
});

describe("verifyReCaptcha", () => {
    test("sends the secret, the token and the address, as a form", async () => {
        const fetch = answerWith({ success: true, challenge_ts: "2026-11-09T23:00:00Z", hostname: "durachok.example" });

        expect(await verifyReCaptcha("the-secret", "the-token", "10.0.0.1")).toEqual({ passed: true, errors: [] });

        const [url, init] = fetch.mock.calls[0]!;
        expect(String(url)).toBe(SITEVERIFY_URL);
        expect(init?.method).toBe("POST");
        const body = init?.body;
        if (!(body instanceof URLSearchParams)) {
            throw new Error(`Expected a form to be sent, not ${String(body)}`);
        }
        expect(Object.fromEntries(body)).toEqual({ secret: "the-secret", response: "the-token", remoteip: "10.0.0.1" });
    });

    test("passes on Google's reasons for a token that didn't pass", async () => {
        answerWith({ success: false, "error-codes": ["timeout-or-duplicate"] });

        expect(await verifyReCaptcha("the-secret", "old-token")).toEqual({
            passed: false,
            errors: ["timeout-or-duplicate"],
        });
    });

    test("doesn't ask Google about an empty token", async () => {
        const fetch = answerWith({ success: true });

        expect(await verifyReCaptcha("the-secret", "")).toEqual({ passed: false, errors: ["missing-input-response"] });
        expect(fetch).not.toHaveBeenCalled();
    });

    test("doesn't pass a token when Google can't answer", async () => {
        answerWith({ message: "unavailable" }, 503);
        expect(await verifyReCaptcha("the-secret", "the-token")).toEqual({ passed: false, errors: ["http-503"] });

        answerWith({ unexpected: true });
        expect(await verifyReCaptcha("the-secret", "the-token")).toEqual({
            passed: false,
            errors: ["unexpected-response"],
        });
    });
});
