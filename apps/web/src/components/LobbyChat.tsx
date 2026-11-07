import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, SendHorizontal, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatTime } from "@/utils";
import { Message } from "@durachok/transport";

/** The longest message that the server takes. */
const MAX_LENGTH = 200;

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
    const list = useRef<HTMLOListElement>(null);

    // While the chat is open, the player sees every message as it arrives.
    if (open && seen !== messages.length) {
        setSeen(messages.length);
    }
    const unread = messages.slice(seen).filter(({ name }) => name !== me).length;

    // The newest message shows, as it arrives and when the chat opens.
    useEffect(() => {
        if (open && messages.length > 0) {
            list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
        }
    }, [messages.length, open]);

    const send = (event: FormEvent) => {
        event.preventDefault();
        const message = draft.trim();
        if (message) {
            onSend(message);
            setDraft("");
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-3 max-sm:bottom-auto max-sm:right-3 max-sm:top-[4.25rem] max-sm:flex-col-reverse">
            <AnimatePresence>
                {open && (
                    <motion.section
                        aria-label="Chat"
                        className="flex h-96 w-80 flex-col overflow-hidden rounded-2xl border bg-card/95 shadow-xl backdrop-blur-sm max-sm:h-[60dvh] max-sm:w-[calc(100vw-1.5rem)]"
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.15 } }}
                    >
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
                        <ol ref={list} className="m-0 flex flex-1 list-none flex-col gap-2 overflow-y-auto px-4 py-3">
                            {messages.length === 0 && (
                                <li className="m-auto text-sm text-muted-foreground">No messages yet. Say hello.</li>
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
