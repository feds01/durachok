import { describe, expect, test } from "bun:test";

import { CHAT_WIDTH, MAX_CHAT_WIDTH, MIN_CHAT_WIDTH, resizeChat } from "./chat";

describe("resizeChat", () => {
    test("widens the chat as its left border moves left, and narrows it as the border moves right", () => {
        expect(resizeChat(CHAT_WIDTH, -40)).toBe(CHAT_WIDTH + 40);
        expect(resizeChat(CHAT_WIDTH, 20)).toBe(CHAT_WIDTH - 20);
    });

    test("keeps the chat between its narrowest and widest", () => {
        expect(resizeChat(CHAT_WIDTH, 1000)).toBe(MIN_CHAT_WIDTH);
        expect(resizeChat(CHAT_WIDTH, -1000)).toBe(MAX_CHAT_WIDTH);
    });
});
