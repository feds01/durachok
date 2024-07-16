import {parseCard} from "shared";

export function isPreviousHolderFree(tableTop, index) {
    let k = 0;

    // special case for index of '0'
    if (index === 0 && tableTop[0].length === 0) {
        return false;
    }

    do {
        if (tableTop[k].length === 0) return true;

        k++;
    } while (k < index);

    return false;
}

/**
 * Generic function to check if a card can be used in play on the table.
 * */
export function canPlace(cards, tableTop, isDefending, canAttack, trumpSuit, playerRef) {
    const allNumerics = new Set(tableTop.flat().map(card => parseCard(card.value).value));

    // build an array for the size
    const N = Math.min(tableTop.filter((item) => item.length > 0).length + 1, 6);
    let a = Array(N), i = 0;
    while (i < N) a[i++] = i - 1;

    return cards.map((card) => {
        if (!isDefending) {
            if (!canAttack) return false; // if they can't attack, they can't place any cards yet!

            const freeSpaces = tableTop.reduce((acc, value) => {
                return value.length === 0 ? acc + 1 : acc;
            }, 0);

            return  freeSpaces > 0 && (allNumerics.size === 0 || allNumerics.has(parseCard(card.value).value));
        } else {
            // This is somewhat inefficient, we could be using 'allNumerics' here somehow.
            return a.map(idx => idx).some((idx) => canPlaceCard(card.value, idx, tableTop, isDefending, trumpSuit.suit, playerRef));
        }
    });
}

export function canPlaceCard(card, pos, tableTop, isDefending, trumpSuit, playerRef) {
    const allNumerics = new Set(tableTop.flat().map(card => parseCard(card.value).value));
    const attackingCard = parseCard(card);

    // count the number of 'placed' and 'uncovered' cards on the table, if adding
    // one more to the table will result in there being more cards than the defender
    // can cover, we should prevent the placement here.
    const uncoveredCount = tableTop.reduce((acc, value) => {
        return value.length === 1 ? acc + 1 : acc;
    }, 0);


    if (isDefending) {

        // special case where defender wants to transfer 'defense' to next player...
        if (
            pos !== 0 && // the defender can't transfer the attack if no cards have been placed.
            allNumerics.size === 1 &&
            allNumerics.has(attackingCard.value) &&
            !isPreviousHolderFree(tableTop, pos) &&
            tableTop.filter(item => item.length > 0).every(item => item.length === 1) &&

            // the next player has enough cards to cover the table
            playerRef.deck >= uncoveredCount + 1
        ) {
            return true;
        }

        // check that the tableTop contains a card at the 'pos'
        if (tableTop[pos].length !== 1) return false;

        const coveringCard = parseCard(tableTop[pos][0].value);

        if (attackingCard.suit === coveringCard.suit) {
            // The trumping suit doesn't matter here since they are the same
            return coveringCard.value < attackingCard.value;
        }

        return attackingCard.suit === trumpSuit;
    } else {
        // check that the tableTop contains a card at the 'pos'
        if (tableTop[pos].length !== 0) {
            return false;
        }

        if (uncoveredCount + 1 > playerRef.deck) return false;

        // special case where the number of cards is zero.
        return allNumerics.size === 0 || allNumerics.has(attackingCard.value);
    }
}
