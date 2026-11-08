import { closestCenter, CollisionDetection, DroppableContainer, pointerWithin, rectIntersection } from "@dnd-kit/core";

/** The id of the player's hand, for a card dragged over it, which goes back in among the others. */
export const HAND_ID = "hand";

/** Whether a place to drop a card is one of the cards in the player's hand. */
const inHand = ({ data }: DroppableContainer) => data.current?.sortable !== undefined;

/**
 * Where a dragged card goes: onto the attack that it's over, before the table around it,
 * and over the hand, to the place of the card under the pointer, as the cards overlap.
 */
export const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    const onTable = hits.find(({ id }) => String(id).startsWith("slot-")) ?? hits.find(({ id }) => id === "table");
    if (onTable) {
        return [onTable];
    }

    const pointer = args.pointerCoordinates;
    if (pointer && hits.some(({ id }) => id === HAND_ID)) {
        const { x, y } = pointer;
        return closestCenter({
            ...args,
            collisionRect: { left: x, right: x, top: y, bottom: y, width: 0, height: 0 },
            droppableContainers: args.droppableContainers.filter(inHand),
        });
    }

    const around = args.droppableContainers.filter((container) => !inHand(container) && container.id !== HAND_ID);
    return rectIntersection({ ...args, droppableContainers: around });
};
