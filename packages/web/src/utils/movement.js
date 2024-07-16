import {CardSuits, parseCard} from "shared";

/**
 * Method to move an item within an array (essentially re-ordering the items).
 *
 * @param {Array<any>} list - The array that is being re-ordered.
 * @param {number} startIndex - The index of the item that is being moved
 * @param {number} endIndex - The index of the placement where the item will be move to
 *
 * @return {Array<any>} the newly formed array from re-ordering the item.
 * */
export function reorder(list, startIndex, endIndex) {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
}

/**
 * Method to move an item from a source array into a destination array without mutating the
 * original arrays.
 *
 * @param {Array<any>} source - The array that the item will be moved out off.
 * @param {Array<any>} dest - The array that the item will be moved into.
 * @param {number} srcIndex - The index of the item in the source array.
 * @param {number} destIndex - The index of where the item will be inserted into the destination array.
 *
 * @return {{src: Array<any>, dest: Array<any>}} the newly formed arrays from moving one item from the source
 * to the dest array.
 * */
export function move(source, dest, srcIndex, destIndex) {
    const sourceClone = Array.from(source);
    const destClone = Array.from(dest);
    const [removed] = sourceClone.splice(srcIndex, 1);

    destClone.splice(destIndex, 0, removed);

    return {src: sourceClone, dest: destClone}
}

/**
 * Method to sort a deck of cards by either the numerical value, and the 'suit/power'
 * value.
 *
 * @param {Array<any>} cards - The array that is being re-ordered.
 * @param {boolean} sortBySuit - Whether or not the cards should be sorted by suit after
 * a numerical sort.
 *
 * @return {Array<any>} the newly formed card array from applying the sorting function(s).
 * */
export function sort(cards, sortBySuit) {
    const ref = cards.map((item) => parseCard(item.value));

    ref.sort((a, b) => {
        return a.value - b.value
    })

    // Here, we'll sort by the order the suit appears in the CardSuits object
    if (sortBySuit) {
        const suits = Object.keys(CardSuits);

        ref.sort((a, b) => {
            return suits.indexOf(a.suit) - suits.indexOf(b.suit);
        });
    }

    return ref.map((item) => ({value: item.card, src: process.env.PUBLIC_URL + `/cards/${item.card}.svg`}));
}

/**
 * Method to compute the steps it takes to sort a deck of cards by either the numerical value, and the
 * 'suit/power' value. The method will record all the 'swaps' that occur in the sort and return
 * them as an array.
 *
 * @param {Array<any>} cards - The array that is being re-ordered.
 * @param {boolean} sortBySuit - Whether or not the cards should be sorted by suit after
 * a numerical sort.
 *
 * @return {Array<any>} An array of steps of how to transform the given card deck into
 * a sorted deck by swapping the elements.
 * */
export function generateSortMoves(cards, sortBySuit = false) {
    const moves = []

    const ref = cards.map((item) => parseCard(item.value));
    const original = cards.map((item) => parseCard(item.value));

    ref.sort((a, b) => {
        return a.value - b.value
    })

    // Here, we'll sort by the order the suit appears in the CardSuits object
    if (sortBySuit) {
        const suits = Object.keys(CardSuits);

        ref.sort((a, b) => {
            return suits.indexOf(a.suit) - suits.indexOf(b.suit);
        });
    }

    // compute the diff of the objects
    let diff = original.map((item, index) => ref.findIndex((x) => x.card === item.card) - index);

    while (!diff.every(item => item === 0)) {
        // get the first non-zero diff so that we can remember it for
        // generating the moves.
        const first = diff.findIndex(item => item !== 0);

        // record this as a step
        let firstCard = original[first].card;
        moves.push({item: firstCard, steps: diff[first]});

        let temp = {...original[first]}
        original[first] = {...original[first + diff[first]]};
        original[first + diff[first]] = temp;

        // we also need to add a move for the shift
        moves.push({item: original[first].card, steps: -(diff[first] - 1)})


        // re-compute the diff for the new array
        diff = original.map((item, index) => ref.findIndex((x) => x.card === item.card) - index);
    }

    // pass this through an optimiser to prevent unnecessary generated moves from occurring
    for (let i = 0; i < moves.length - 1; i++) {
        if (moves[i].item === moves[i + 1].item) {
            moves[i].steps = moves[i].steps + moves[i + 1].steps;
            moves.splice(i + 1, 1);
        }

        // if two moves cancel each other out, just remove it
        if (moves[i].steps === 0) {
            moves.splice(i, 1);
        }
    }

    return moves;
}
