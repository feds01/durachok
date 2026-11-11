/** How wide the lobby's chat is, in pixels, until the player drags its left border. */
export const CHAT_WIDTH = 320;

/** The narrowest that the player can make the chat. */
export const MIN_CHAT_WIDTH = 280;

/** The widest that the player can make the chat, unless the window is narrower still. */
export const MAX_CHAT_WIDTH = 640;

/**
 * How wide the chat becomes, from `width`, when its left border moves `by` pixels to the right.
 * The chat sits in the right corner, so it widens as its left border moves left.
 */
export function resizeChat(width: number, by: number): number {
    return Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, width - by));
}
