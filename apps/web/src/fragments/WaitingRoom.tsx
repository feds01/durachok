import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Crown, Link2, LogOut, User, X } from "lucide-react";
import { useEffect, useState } from "react";

import LobbyPassphrase from "@/components/LobbyPassphrase";
import Logo from "@/components/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLobbyStore } from "@/contexts/lobby";
import { fadeUp, popIn, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Lobby } from "@durachok/transport";
import { Link } from "@tanstack/react-router";

type Player = Lobby["players"][number];

type Props = {
    lobby: Lobby;
    /** Whether the current user owns the lobby. */
    isOwner: boolean;
    /** Whether a player is the current user. */
    isMe: (player: Player) => boolean;
    /** Leave the lobby, which only players other than the owner can. */
    onLeave: () => void;
};

/** The lobby before its game starts: who has joined, and for the owner, the controls. */
export default function WaitingRoom({ lobby, isOwner, isMe, onLeave }: Props) {
    const start = useLobbyStore((state) => state.start);
    const kick = useLobbyStore((state) => state.kick);
    const rotatePassphrase = useLobbyStore((state) => state.rotatePassphrase);
    const canStart = lobby.players.length >= 2;

    return (
        <motion.div
            className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8"
            variants={stagger(0.08)}
            initial="hidden"
            animate="visible"
        >
            <motion.header variants={fadeUp} className="flex flex-wrap items-center justify-between gap-4">
                <Logo size={32} />
                <div className="flex items-center gap-2">
                    <CopyInviteLinkButton pin={lobby.pin} />
                    {isOwner ? (
                        <Button variant="ghost" asChild>
                            <Link to="/user">Dashboard</Link>
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={onLeave}>
                            <LogOut />
                            Leave
                        </Button>
                    )}
                </div>
            </motion.header>

            <motion.div variants={fadeUp} className="text-center">
                <p className="m-0 font-body text-sm uppercase tracking-widest text-muted-foreground">Lobby</p>
                <h1 className="m-0 text-6xl tracking-widest">
                    <code>{lobby.pin}</code>
                </h1>
            </motion.div>

            {isOwner && lobby.passphrase && (
                <motion.div variants={fadeUp}>
                    <LobbyPassphrase key={lobby.passphrase} passphrase={lobby.passphrase} onRotate={rotatePassphrase} />
                </motion.div>
            )}

            <motion.section variants={fadeUp} className="rounded-xl border bg-card p-4">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="m-0 font-body text-xl">
                        Players{" "}
                        <span className="text-muted-foreground">
                            {lobby.players.length} / {lobby.maxPlayers}
                        </span>
                    </h2>
                    {isOwner && (
                        <Button onClick={start} disabled={!canStart}>
                            Start
                            <ArrowRight />
                        </Button>
                    )}
                </div>
                <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
                    <AnimatePresence initial={false}>
                        {lobby.players.map((player) => {
                            const isLobbyOwner = player.id === lobby.owner.id;
                            return (
                                <PlayerItem
                                    key={player.id}
                                    player={player}
                                    isOwner={isLobbyOwner}
                                    isMe={isMe(player)}
                                    {...(isOwner && !isLobbyOwner && { onKick: () => kick(player.name) })}
                                />
                            );
                        })}
                    </AnimatePresence>
                </ul>
                <p className="mb-0 mt-4 text-center font-body text-muted-foreground">
                    {isOwner
                        ? canStart
                            ? "Start the game once everyone is in."
                            : "Share the invite link or the pin. The game needs at least two players."
                        : `Waiting for ${lobby.owner.name} to start the game…`}
                </p>
            </motion.section>
        </motion.div>
    );
}

type PlayerItemProps = {
    player: Player;
    isOwner: boolean;
    isMe: boolean;
    /** Remove the player, which the lobby's owner can do. */
    onKick?: () => void;
};

function PlayerItem({ player, isOwner, isMe, onKick }: PlayerItemProps) {
    return (
        <motion.li
            layout
            variants={popIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
                "relative flex flex-col items-center gap-2 rounded-lg border bg-background/40 p-3",
                isMe && "border-primary",
            )}
        >
            <Avatar className="size-14 border-2 border-primary">
                <AvatarImage src={player.image} alt="" />
                <AvatarFallback className="bg-card text-white">
                    <User className="size-8" />
                </AvatarFallback>
            </Avatar>
            <span className="flex max-w-full items-center gap-1 font-body text-base">
                {isOwner && <Crown className="size-4 shrink-0 text-amber-400" aria-label="Owner" />}
                <span className="truncate">{player.name}</span>
            </span>
            {isMe && <span className="font-body text-xs text-muted-foreground">You</span>}
            {onKick && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 size-7"
                    onClick={onKick}
                    aria-label={`Remove ${player.name}`}
                    title={`Remove ${player.name}`}
                >
                    <X />
                </Button>
            )}
        </motion.li>
    );
}

/** Copies the link that people open to join the lobby. */
function CopyInviteLinkButton({ pin }: { pin: string }) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) {
            return;
        }

        const timer = setTimeout(() => setCopied(false), 2000);
        return () => clearTimeout(timer);
    }, [copied]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/lobby/${pin}`);
            setCopied(true);
        } catch {
            // The browser refused, e.g. outside a secure context. The pin is on screen anyway.
        }
    };

    return (
        <Button variant="secondary" onClick={copy}>
            {copied ? <Check /> : <Link2 />}
            {copied ? "Copied" : "Copy invite link"}
        </Button>
    );
}
