import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowRight,
    Bot,
    Check,
    Crown,
    Layers,
    LayoutDashboard,
    Link2,
    ListOrdered,
    Lock,
    LockOpen,
    LogOut,
    LucideIcon,
    MessageSquare,
    MessageSquareOff,
    Settings,
    Shuffle,
    Sparkles,
    Swords,
    Timer,
    User,
    UserPlus,
    X,
} from "lucide-react";
import { useState } from "react";

import AppHeader from "@/components/AppHeader";
import CopyButton from "@/components/CopyButton";
import LobbyPassphrase from "@/components/LobbyPassphrase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLobbyStore } from "@/contexts/lobby";
import LobbySettingsDialog from "@/fragments/LobbySettingsDialog";
import { fadeUp, popIn, stagger } from "@/lib/motion";
import { PANEL } from "@/lib/styles";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { isDef } from "@/utils";
import { GameSettings, Lobby } from "@durachok/transport";
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
    const updateSettings = useLobbyStore((state) => state.updateSettings);
    const canStart = lobby.players.length >= 2;
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <motion.div
            className="flex w-full flex-col px-4 pb-10"
            variants={stagger(0.08)}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={fadeUp}>
                {/* A guest who leaves before the game gives up their place, so the logo stays put for them. */}
                <AppHeader linkHome={isOwner}>
                    <CopyInviteLinkButton pin={lobby.pin} />
                    {isOwner && (
                        <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
                            <Settings />
                            Settings
                        </Button>
                    )}
                    {isOwner ? (
                        <Button asChild>
                            <Link to="/user">
                                <LayoutDashboard />
                                Dashboard
                            </Link>
                        </Button>
                    ) : (
                        <Button variant="secondary" onClick={onLeave}>
                            <LogOut />
                            Leave
                        </Button>
                    )}
                </AppHeader>
            </motion.div>

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
                <motion.div variants={fadeUp} className="text-center">
                    <p className="m-0 text-sm uppercase tracking-[0.3em] text-muted-foreground">Lobby</p>
                    <div className="group relative inline-flex items-center">
                        <h1 className="m-0 font-display text-7xl font-black italic lining-nums tabular-nums tracking-[0.2em] max-sm:text-6xl max-sm:tracking-[0.12em]">
                            {lobby.pin}
                        </h1>
                        <CopyButton
                            value={lobby.pin}
                            label="Copy the pin"
                            className="absolute left-full ml-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                        />
                    </div>
                    <SettingsSummary lobby={lobby} {...(isOwner && { onChange: updateSettings })} />
                </motion.div>

                {isOwner && lobby.passphrase && (
                    <motion.div variants={fadeUp}>
                        <LobbyPassphrase passphrase={lobby.passphrase} onRotate={rotatePassphrase} />
                    </motion.div>
                )}

                <motion.section variants={fadeUp} className={PANEL}>
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h2 className="m-0 text-2xl">Players</h2>
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-sm text-muted-foreground">
                                {lobby.players.length} / {lobby.maxPlayers}
                            </span>
                        </div>
                        {isOwner && (
                            <Button size="lg" onClick={start} disabled={!canStart}>
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
                            {Array.from({ length: Math.max(lobby.maxPlayers - lobby.players.length, 0) }, (_, seat) => (
                                <OpenSeat key={`seat-${lobby.players.length + seat}`} />
                            ))}
                        </AnimatePresence>
                    </ul>
                    <p className="mb-0 mt-5 text-center text-muted-foreground">
                        {isOwner
                            ? canStart
                                ? "Start the game once everyone is in."
                                : "Share the invite link or the pin. The game needs at least two players."
                            : `Waiting for ${lobby.owner.name} to start the game…`}
                    </p>
                </motion.section>
            </div>

            {isOwner && (
                <LobbySettingsDialog lobby={lobby} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
            )}
        </motion.div>
    );
}

/** The round times that the owner steps through by clicking the timer, in seconds. */
const ROUND_TIMEOUTS = [60, 120, 180, 300, 600];

/** The most players that the short deck has enough cards for. */
const SHORT_DECK_MAX_PLAYERS = 6;

type Attribute = {
    /** Which setting it is, which stays the same as it changes. */
    id: string;
    icon: LucideIcon;
    /** What the setting is, for the tooltip and screen readers. */
    description: string;
    /** A short value beside the icon, if the icon alone doesn't say it. */
    value?: string;
    /** Whether the setting is off, which shows it dimmed. */
    off?: boolean;
    /** The settings that clicking it, as the owner, changes to. */
    next: GameSettings;
    /** Why the owner can't change it right now, if they can't. */
    blocked?: string;
};

/** The settings that a lobby has, in the shape that changing them takes. */
function settingsOf(lobby: Lobby): GameSettings {
    return {
        maxPlayers: lobby.maxPlayers,
        roundTimeout: lobby.roundTimeout,
        passphrase: lobby.hasPassphrase,
        shortGameDeck: lobby.shortGameDeck,
        freeForAll: lobby.freeForAll,
        disableChat: lobby.disableChat,
        randomisePlayerOrder: lobby.randomisePlayerOrder,
        mythicMode: lobby.mythicMode,
    };
}

type SettingsSummaryProps = {
    lobby: Lobby;
    /** Change the settings, which only the owner can, by clicking them. */
    onChange?: (settings: GameSettings) => void;
};

/** The lobby's settings at a glance, as icons. The owner changes one by clicking it. */
function SettingsSummary({ lobby, onChange }: SettingsSummaryProps) {
    const settings = settingsOf(lobby);
    const nextTimeout = ROUND_TIMEOUTS.find((timeout) => timeout > lobby.roundTimeout) ?? ROUND_TIMEOUTS[0];

    const attributes: Attribute[] = [
        {
            id: "deck",
            icon: Layers,
            value: lobby.shortGameDeck ? "36" : "52",
            description: lobby.shortGameDeck ? "Short deck of 36 cards" : "Full deck of 52 cards",
            next: { ...settings, shortGameDeck: !lobby.shortGameDeck },
            ...(!lobby.shortGameDeck &&
                lobby.maxPlayers > SHORT_DECK_MAX_PLAYERS && {
                    blocked: `The short deck has cards for ${SHORT_DECK_MAX_PLAYERS} players at most`,
                }),
        },
        {
            id: "timer",
            icon: Timer,
            value: `${lobby.roundTimeout}s`,
            description: `Rounds last up to ${lobby.roundTimeout} seconds`,
            next: { ...settings, roundTimeout: nextTimeout },
        },
        {
            id: "attacks",
            icon: lobby.freeForAll ? Swords : ListOrdered,
            description: lobby.freeForAll
                ? "Free for all: anyone can attack after the first card"
                : "Players attack in turn",
            next: { ...settings, freeForAll: !lobby.freeForAll },
        },
        {
            id: "seats",
            icon: Shuffle,
            description: lobby.randomisePlayerOrder ? "Random seats" : "Seats in the order that players joined",
            off: !lobby.randomisePlayerOrder,
            next: { ...settings, randomisePlayerOrder: !lobby.randomisePlayerOrder },
        },
        {
            id: "passphrase",
            icon: lobby.hasPassphrase ? Lock : LockOpen,
            description: lobby.hasPassphrase ? "Joining needs the passphrase" : "Anyone with the pin can join",
            off: !lobby.hasPassphrase,
            next: { ...settings, passphrase: !lobby.hasPassphrase },
        },
        {
            id: "mythic",
            icon: Sparkles,
            description: lobby.mythicMode
                ? "Mythic mode: nobody is told how many cards anyone holds"
                : "Everyone sees how many cards each player holds",
            off: !lobby.mythicMode,
            next: { ...settings, mythicMode: !lobby.mythicMode },
        },
        {
            id: "chat",
            icon: lobby.disableChat ? MessageSquareOff : MessageSquare,
            description: lobby.disableChat ? "Chat is off" : "Chat is on",
            off: lobby.disableChat,
            next: { ...settings, disableChat: !lobby.disableChat },
        },
    ];

    return (
        <ul aria-label="Game settings" className="m-0 mt-5 flex list-none flex-wrap justify-center gap-3 p-0">
            {attributes.map(({ id, icon: Icon, value, description, off, next, blocked }) => {
                const tooltip = onChange ? (blocked ?? `${description}. Click to change it.`) : description;
                const content = (
                    <>
                        <Icon className="size-4" aria-hidden="true" />
                        {value && <span aria-hidden="true">{value}</span>}
                        {/* Shown on hover, and read out by screen readers. */}
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                            {tooltip}
                        </span>
                    </>
                );
                const badge = cn(
                    "group relative flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground transition-colors",
                    off && "opacity-50",
                );

                return (
                    <li key={id}>
                        {onChange ? (
                            <button
                                type="button"
                                onClick={() => onChange(next)}
                                disabled={isDef(blocked)}
                                className={cn(
                                    badge,
                                    "cursor-pointer hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed",
                                )}
                            >
                                {content}
                            </button>
                        ) : (
                            <span className={cn(badge, "cursor-default hover:border-primary hover:text-foreground")}>
                                {content}
                            </span>
                        )}
                    </li>
                );
            })}
        </ul>
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
            whileHover={{ y: -4 }}
            className={cn(
                "group relative flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-xl border bg-gradient-to-b from-secondary/70 to-card p-3 shadow-md",
                isMe && "border-primary ring-1 ring-primary/40",
            )}
        >
            {isOwner && <Crown className="absolute left-2.5 top-2.5 size-5 text-amber-400" aria-label="Owner" />}
            <Avatar className="size-16 border-2 border-primary shadow-lg">
                <AvatarImage src={player.image} alt="" />
                <AvatarFallback className="bg-card text-white">
                    {player.bot ? <Bot className="size-8" /> : <User className="size-8" />}
                </AvatarFallback>
            </Avatar>
            <span className="max-w-full truncate text-base font-medium">{player.name}</span>
            {isMe && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">You</span>}
            {player.bot && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">Bot</span>
            )}
            {onKick && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
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

/** A place in the lobby that nobody has taken yet. */
function OpenSeat() {
    return (
        <motion.li
            layout
            variants={popIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground/50"
        >
            <UserPlus className="size-6" aria-hidden="true" />
            <span className="text-sm">Open seat</span>
        </motion.li>
    );
}

/** Copies the link that people open to join the lobby. */
function CopyInviteLinkButton({ pin }: { pin: string }) {
    const [copied, copy] = useCopy();

    return (
        <Button variant="secondary" onClick={() => copy(`${window.location.origin}/lobby/${pin}`)}>
            {copied ? <Check /> : <Link2 />}
            {copied ? "Copied" : "Invite link"}
        </Button>
    );
}
