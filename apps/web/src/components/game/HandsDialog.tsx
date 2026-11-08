import PlayingCard from "@/components/game/PlayingCard";
import UserAvatar from "@/components/UserAvatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SeenHand, suitOf } from "@durachok/engine";

type Props = {
    /** The hands that the player can see, the one that they asked for first, @see visibleHands. */
    hands: SeenHand[];
    /** The player whose seat was clicked, or null while the dialog is closed. */
    focus: string | null;
    trumpSuit: string;
    imageOf: (name: string) => string | undefined;
    onClose: () => void;
};

/**
 * Every hand still in the game, card by card, for a player who is out of it and watches the rest
 * play out. A seat at the table only has room for a few small cards.
 */
export default function HandsDialog({ hands, focus, trumpSuit, imageOf, onClose }: Props) {
    return (
        <Dialog open={focus !== null && hands.length > 0} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Everyone's cards</DialogTitle>
                    <DialogDescription>You're out of the game, so you can see the hands still in it.</DialogDescription>
                </DialogHeader>
                <ul className="m-0 flex list-none flex-col gap-5 p-0">
                    {hands.map(({ name, cards }) => (
                        <li key={name} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <UserAvatar image={imageOf(name)} size={24} />
                                <span className="font-semibold">{name}</span>
                                <span className="text-sm tabular-nums text-muted-foreground">
                                    {cards.length} {cards.length === 1 ? "card" : "cards"}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 [--card-w:56px] max-sm:[--card-w:44px]">
                                {cards.map((card) => (
                                    <PlayingCard key={card} card={card} trump={suitOf(card) === trumpSuit} />
                                ))}
                            </div>
                        </li>
                    ))}
                </ul>
            </DialogContent>
        </Dialog>
    );
}
