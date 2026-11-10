import { Eye, LogOut } from "lucide-react";

import Logo from "@/components/Logo";
import OpponentSeat from "@/components/game/OpponentSeat";
import { DeckPile, DiscardPile } from "@/components/game/Piles";
import TableArea from "@/components/game/TableArea";
import { Button } from "@/components/ui/button";
import { readActions } from "@/lib/table";
import { placesOf, tableCards } from "@durachok/engine";
import { Action, Lobby, SpectatorGameState } from "@durachok/transport";

type Props = {
    lobby: Lobby;
    /** The game as it's watched, without anyone's cards, or nothing until one starts. */
    game: SpectatorGameState | null;
    /** What happened in the game's last update, so that the cards fly in from their players' seats. */
    actions: readonly Action[];
    onStop: () => void;
};

/** A spectator can't play, so the table does nothing with a card. */
const NOTHING = () => {};

/**
 * The game as a spectator watches it: every player in their seat, with how many cards they hold,
 * the deck, the table and the discard pile, but nobody's cards. Until a game starts, it waits.
 */
export default function SpectatorTable({ lobby, game, actions, onStop }: Props) {
    return (
        <div className="flex min-h-full flex-col [--card-w:56px] sm:[--card-w:76px] lg:[--card-w:92px]">
            <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
                <div className="max-sm:hidden">
                    <Logo size={28} />
                </div>
                <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-between">
                    <span className="flex items-center gap-1.5 rounded-full border bg-card/80 px-3 py-1 text-sm text-muted-foreground">
                        <Eye className="size-4" aria-hidden="true" />
                        Watching <span className="font-semibold tabular-nums text-foreground">{lobby.pin}</span>
                    </span>
                    <Button variant="secondary" onClick={onStop}>
                        <LogOut />
                        Stop watching
                    </Button>
                </div>
            </header>
            {game ? (
                <WatchedGame lobby={lobby} game={game} actions={actions} />
            ) : (
                <p className="m-auto px-4 text-center text-lg text-muted-foreground">
                    The game hasn't started. It shows here once it does.
                </p>
            )}
        </div>
    );
}

type WatchedGameProps = Omit<Props, "game" | "onStop"> & { game: SpectatorGameState };

/** The players around the table, and the deck, the table and the discard pile between them. */
function WatchedGame({ lobby, game, actions }: WatchedGameProps) {
    const update = readActions(actions, null);
    const places = placesOf(game.players);
    const imageOf = (name: string) => lobby.players.find((player) => player.name === name)?.image;

    return (
        <>
            <ul aria-label="Players" className="m-0 flex list-none flex-wrap justify-center gap-3 px-4 py-0">
                {game.players.map((player) => (
                    <OpponentSeat
                        key={player.name}
                        player={player}
                        image={imageOf(player.name)}
                        place={places.get(player.name)}
                    />
                ))}
            </ul>
            {/* As at a player's table: the deck and the discard pile take columns as wide as each other. */}
            <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-2 items-center gap-4 px-4 py-4 sm:grid-cols-[calc(var(--card-w)*1.6)_1fr_calc(var(--card-w)*1.6)]">
                <div className="justify-self-start">
                    <DeckPile size={game.deckSize} trump={game.trump} />
                </div>
                <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                    <TableArea
                        cards={tableCards(game)}
                        role="none"
                        targets={null}
                        defending={false}
                        clearTo={update.clearTo}
                        sources={{
                            fromHand: new Set(),
                            dropped: null,
                            playedBy: update.playedBy,
                            trumpSuit: game.trump.suit,
                        }}
                        onPlace={NOTHING}
                        onCover={NOTHING}
                    />
                </div>
                <div className="justify-self-end sm:justify-self-start">
                    <DiscardPile count={game.discardSize} />
                </div>
            </div>
        </>
    );
}
