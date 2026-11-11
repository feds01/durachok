import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, SendHorizontal, X } from "lucide-react";
import { FormEvent, KeyboardEvent, PointerEvent, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHAT_WIDTH, MAX_CHAT_WIDTH, MIN_CHAT_WIDTH, resizeChat } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { formatTime } from "@/utils";
import { Message } from "@durachok/transport";

/** The longest message that the server takes. */
const MAX_LENGTH = 200;

/** How far an arrow key moves the chat's left border, in pixels. */
const KEY_STEP = 32;

type Props = {
    messages: Message[];
    /** The player's own name, whose messages sit on the other side. */
    me: string | null;
    onSend: (message: string) => void;
};

/**
 * The lobby's chat, behind a button in the corner that counts the messages the player
 * hasn't seen. On a phone, it sits under the header, out of the way of the player's cards.
 */
export default function LobbyChat({ messages, me, onSend }: Props) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const [seen, setSeen] = useState(messages.length);
    const [width, setWidth] = useState(CHAT_WIDTH);
    const scroller = useRef<HTMLDivElement>(null);
    const id = useId();

    // While the chat is open, the player sees every message as it arrives.
    if (open && seen !== messages.length) {
        setSeen(messages.length);
    }
    const unread = messages.slice(seen).filter(({ name }) => name !== me).length;

    const send = (event: FormEvent) => {
        event.preventDefault();
        const message = draft.trim();
        if (message) {
            onSend(message);
            setDraft("");
            // The player's message comes in at the bottom, even when they had scrolled up.
            scroller.current?.scrollTo({ top: 0 });
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-3 max-sm:bottom-auto max-sm:right-3 max-sm:top-[4.25rem] max-sm:flex-col-reverse">
            <AnimatePresence>
                {open && (
                    <motion.section
                        id={id}
                        aria-label="Chat"
                        className="relative flex h-96 w-(--chat-width) flex-col overflow-hidden rounded-2xl border bg-card/95 shadow-xl backdrop-blur-sm sm:max-w-[calc(100vw-2rem)] max-sm:h-[60dvh] max-sm:w-[calc(100vw-1.5rem)]"
                        style={{ "--chat-width": `${width}px` }}
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.15 } }}
                    >
                        <ResizeBorder chat={id} width={width} onResize={setWidth} />
                        <header className="flex items-center justify-between border-b px-4 py-2">
                            <h2 className="m-0 text-lg">Chat</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setOpen(false)}
                                aria-label="Close the chat"
                            >
                                <X />
                            </Button>
                        </header>
                        {/*
                         * Laid out from the bottom up, the list starts at its newest message and stays
                         * there as messages arrive, however fast they come, and as the chat is resized.
                         * When the player scrolls up to read older messages, new ones don't pull them back down.
                         */}
                        <div ref={scroller} className="flex flex-1 flex-col-reverse overflow-y-auto">
                            <ol className="m-0 flex grow list-none flex-col gap-2 px-4 py-3">
                                {messages.length === 0 && (
                                    <li className="m-auto text-sm text-muted-foreground">
                                        No messages yet. Say hello.
                                    </li>
                                )}
                                {messages.map(({ name, time, message }) => {
                                    const mine = name === me;
                                    return (
                                        <li
                                            key={`${time}-${name}`}
                                            className={cn(
                                                "flex max-w-[85%] flex-col gap-0.5",
                                                mine ? "items-end self-end" : "items-start",
                                            )}
                                        >
                                            <span className="text-xs text-muted-foreground">
                                                {mine ? "You" : name} · {formatTime(time)}
                                            </span>
                                            <span
                                                className={cn(
                                                    "break-words rounded-2xl px-3 py-1.5 text-sm",
                                                    mine
                                                        ? "rounded-br-sm bg-primary text-primary-foreground"
                                                        : "rounded-bl-sm bg-secondary",
                                                )}
                                            >
                                                {message}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                        <form onSubmit={send} className="flex gap-2 border-t p-3">
                            <Input
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                maxLength={MAX_LENGTH}
                                placeholder="Message"
                                aria-label="Message"
                            />
                            <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send">
                                <SendHorizontal />
                            </Button>
                        </form>
                    </motion.section>
                )}
            </AnimatePresence>
            <Button
                onClick={() => setOpen(!open)}
                className="relative size-12 rounded-full shadow-lg"
                aria-label={open ? "Close the chat" : unread > 0 ? `Open the chat, ${unread} unread` : "Open the chat"}
                aria-expanded={open}
            >
                <MessageSquare className="size-5!" />
                {!open && unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-semibold text-white">
                        {unread}
                    </span>
                )}
            </Button>
        </div>
    );
}

type ResizeBorderProps = {
    /** The id of the chat that the border resizes. */
    chat: string;
    width: number;
    onResize: (width: number) => void;
};

/**
 * The chat's left border, which the player drags, or moves with the arrow keys, to make the
 * chat wider or narrower. On a phone, the chat spans the screen, so it has none.
 */
function ResizeBorder({ chat, width, onResize }: ResizeBorderProps) {
    // Where the pointer was, and how wide the chat was, when the player started dragging.
    const drag = useRef<{ x: number; width: number } | null>(null);

    const start = (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) {
            return;
        }
        // The border follows the pointer even as it leaves the border, until the player lets go.
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, width };
    };

    const move = (event: PointerEvent<HTMLDivElement>) => {
        if (drag.current) {
            onResize(resizeChat(drag.current.width, event.clientX - drag.current.x));
        }
    };

    // The pointer lets go of the border as the player releases it, or the browser takes it over.
    const stop = () => {
        drag.current = null;
    };

    const step = (event: KeyboardEvent<HTMLDivElement>) => {
        switch (event.key) {
            case "ArrowLeft":
                event.preventDefault();
                onResize(resizeChat(width, -KEY_STEP));
                return;
            case "ArrowRight":
                event.preventDefault();
                onResize(resizeChat(width, KEY_STEP));
                return;
        }
    };

    return (
        <div
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a separator that can be focused and moved is a widget, which an <hr> can't be
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize the chat"
            aria-controls={chat}
            aria-valuemin={MIN_CHAT_WIDTH}
            aria-valuemax={MAX_CHAT_WIDTH}
            aria-valuenow={width}
            aria-valuetext={`${width} pixels wide`}
            tabIndex={0}
            onPointerDown={start}
            onPointerMove={move}
            onLostPointerCapture={stop}
            onKeyDown={step}
            className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-ew-resize touch-none select-none transition-colors hover:bg-primary/30 focus-visible:bg-primary focus-visible:outline-none max-sm:hidden"
        />
    );
}
