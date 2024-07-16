import clsx from "clsx";
import React from "react";
import PropTypes from 'prop-types';
import useSound from "use-sound";
import debounce from "lodash.debounce";
import styles from "./index.module.scss";
import {DragDropContext} from "react-beautiful-dnd";
import withStyles from "@material-ui/core/styles/withStyles";

import Chat from "./Chat";
import Table from "./Table";
import Player from "./Player";
import Header from "./Header";
import CardHolder from "./CardHolder";
import VictoryDialog from "./Victory";
import Announcement from "./Announcement";
import PlayerActions from "./PlayerActions";
import {GameContext} from "./GameContext";
import {delay} from "../../../utils/delay";
import {useChatState} from "../../../contexts/chat";
import {move, reorder} from "../../../utils/movement";
import {canPlaceCard} from "../../../utils/placement";
import {arraysEqual, deepEqual} from "../../../utils/equal";
import {SettingProvider} from "../../../contexts/SettingContext";
import {ClientEvents, TableSize, MoveTypes, ServerEvents} from "shared";

import place from "./../../../assets/sound/place.mp3";
import begin from "./../../../assets/sound/begin.mp3";

// Import our key bind configurations
import keyBinds from "./../../../assets/config/key_binds.json";

// An abstraction of how player avatars should be added depending on the
// number of opponents in the game. The player avatars will be added depending
// on the 'area' they have been allocated on the game board.
import AvatarGridLayout from "./../../../assets/config/avatar_layout.json";
import SpectatorGridLayout from "./../../../assets/config/spectator_avatar_layout.json";

const drawerWidth = 300;
const chatDrawerStyles = theme => ({
    root: {
        height: "100vh",
        display: 'flex',
        flexDirection: 'column',
    },

    tableRoot: {
        flex: "1",
        display: 'flex',
    },

    content: {
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        marginRight: -drawerWidth,
    },
    contentShift: {
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
        marginRight: 0,
    },
});


class Game extends React.Component {
    static EmptyPlaceMap = Array.from(Array(6), () => true);

    constructor(props) {
        super(props)

        this.state = {
            game: {
                deck: [],
                turned: false,
                out: false,
                canAttack: false,
                isDefending: false,
                trumpCard: null,
                tableTop: Array.from(Array(6), () => []),
                players: [],
            },

            // State related to UI
            dragApi: null,
            canPlaceMap: Game.EmptyPlaceMap,
            showVictory: false,
            showAnnouncement: false,
            spectating: null,
            isDragging: false,
        }

        // refs
        this.sortButtonRef = React.createRef();
        this.skipButtonRef = React.createRef();

        // rendering helpers
        this.renderPlayerRegion = this.renderPlayerRegion.bind(this);

        // game actions
        this.canForfeit = this.canForfeit.bind(this);

        // user interaction with the game board
        this.setCards = this.setCards.bind(this);
        this.moveCards = this.moveCards.bind(this);
        this.keyListener = this.keyListener.bind(this);
        this.setSpectator = this.setSpectator.bind(this);

        this.onDragEnd = this.onDragEnd.bind(this);
        this.onBeforeCapture = this.onBeforeCapture.bind(this);
        this.handleGameStateUpdate = this.handleGameStateUpdate.bind(this);
    }

    /**
     * Method to determine if a player can invoke a 'forfeit' action for the current
     * game state.
     * */
    canForfeit() {
        // player cannot skip if no cards are present on the table top.
        if (this.state.game.tableTop.flat().length === 0) {
            return false;
        }

        const uncoveredCount = this.state.game.tableTop.reduce((acc, value) => {
            return value.length === 1 ? acc + 1 : acc;
        }, 0);

        // Case for defender when they have covered all the cards.
        if (uncoveredCount === 0 && this.state.game.isDefending) return false;

        return !this.state.game.turned && !this.state.game.out;
    }

    /**
     * This method is invoked before a react-beautiful-dnd drag event occurs. This method is
     * used to determine which 'droppable' areas we should disable based on the card that
     * is being dragged.
     *
     * */
    onBeforeCapture(event) {
        const {isDefending, trumpCard, canAttack, tableTop} = this.state.game;
        const card = event.draggableId;

        // This is used for some more advanced checking if cards can be
        // placed down by the current player. All of the logic is internally
        // handled by the canPLaceCard function, however the player reference
        // depends on whether this is the defending or attacking player.
        let nextPlayer;

        if (isDefending) {
            nextPlayer = this.state.game.players.find(p => !p.out);
        } else {
            // get our defender to check for the corner case where there would be
            // more cards on the table top than the defender could cover.
            nextPlayer = this.state.game.players.find((p) => p.isDefending);
        }

        this.setState({
            isDragging: true,
            canPlaceMap: Object.keys(tableTop).map((item, index) => {
                return (!isDefending === canAttack) &&
                    canPlaceCard(card, index, tableTop, isDefending, trumpCard.suit, nextPlayer);
            })
        });
    }

    /**
     * This method is invoked after a react-beautiful-dnd drag event occurs. This method is
     * used to determine how the internal component state should change depending on the
     * event. If a card is moved in the player deck, the player deck is just re-ordered, however
     * if a card moves from the player deck onto the table top, the card should be moved out of
     * the game deck state into the table top state.
     *
     * */
    onDragEnd(result) {
        const {source, destination} = result;

        // dropped outside the list
        if (!destination) {
            // reset the canPlaceMap for new cards
            return this.setState({isDragging: false, canPlaceMap: Game.EmptyPlaceMap});
        }

        if (source.droppableId === destination.droppableId) {
            this.setState(prevState => ({
                isDragging: false,
                canPlaceMap: Game.EmptyPlaceMap,
                game: {
                    ...prevState.game,
                    deck: reorder(
                        this.state.game.deck,
                        source.index,
                        destination.index
                    ),
                },
            }));
        } else if (destination.droppableId.startsWith("holder-")) {
            const {isDefending, tableTop, deck} = this.state.game;

            // get the index and check if it currently exists on the table top
            const index = parseInt(destination.droppableId.split("-")[1]);

            // get a copy of the item that just moved
            const item = deck[source.index];
            const result = move(deck, tableTop[index], source.index, destination.index);

            const resultantTableTop = tableTop;
            resultantTableTop[index] = result.dest;

            this.setState(prevState => ({
                isDragging: false,
                canPlaceMap: Game.EmptyPlaceMap,
                game: {
                    ...prevState.game,
                    deck: result.src,
                    tableTop: resultantTableTop
                },
            }));

            // emit a socket event to notify that the player has made a move...
            this.props.socket.emit(ServerEvents.MOVE, {
                ...(isDefending && {
                    // handle the case where the player is re-directing the attack vector to the next player.
                    type: result.dest.length === 2 ? MoveTypes.COVER : MoveTypes.PLACE,
                    card: item.value,
                    pos: index,
                }),

                ...(!isDefending && {
                    type: MoveTypes.PLACE,
                    card: item.value
                })
            });
        }
    }

    /**
     * This method is used to programmatically move a card in the players deck by
     * selecting an item, giving it a direction, and specifying how many place to move
     * the card.
     *
     * @param {{item: number, steps: number}[]} moves - The moves to perform
     * */
    async moveCards(moves) {
        const {dragApi} = this.state;
        if (!dragApi) throw new Error("Uninitialised Drag API");

        for (let move of moves) {
            let {item, steps} = move;

            dragApi.tryReleaseLock();

            // @@Note: Interesting bug here, if the item doesn't change between current move and previous
            //         move, the lock fails to acquire. I don't understand why this would be an issue...
            const preDrag = dragApi.tryGetLock(item, () => {
            });

            // We fail to acquire lock, but that's ok since it's likely that the user is
            // spamming the sorting function.
            if (!preDrag) return;

            const actions = preDrag.snapLift();
            const direction = steps < 0 ? "left" : "right";
            steps = Math.abs(steps);

            while (steps > 0 && actions.isActive()) {
                await delay(() => {
                    if (actions.isActive()) {
                        // Move the item depending on the direction.
                        if (direction === "left") {
                            actions.moveLeft();
                        } else {
                            actions.moveRight();
                        }
                    }
                });
                steps--;
            }

            if (actions.isActive()) actions.drop();
        }
    }

    /**
     * Method to set the player deck.
     * */
    setCards(deck) {
        this.setState((prevState) => ({
            game: {
                ...prevState.game,
                deck
            }
        }));
    }

    setSpectator(name) {
        const {players, out} = this.state.game;
        const {spectating} = this.state;

        // don't update anything if the current spectator is the same
        if (spectating === name || name === null) return;

        // this should never happen, but the player is not allowed to spectate if they are
        // not out of the game...
        if (!out) throw new Error("Cannot spectate player whilst being an active player.");
        if (!players.map(p => p.name).includes(name)) throw new Error("Cannot spectate non-existent player.")

        const player = players.find(player => player.name === name);

        // set this player's deck as the spectating player's deck
        this.setState((prevState) => ({
            spectating: name,
            game: {
                ...prevState.game,
                deck: player.deck.map((card) => {
                    return {value: card, src: process.env.PUBLIC_URL + `/cards/${card}.svg`};
                })
            }
        }));
    }

    /**
     * Method to handle key presses and invoke some action based on the key.
     *
     * @param {KeyboardEvent} event - The event to process
     * */
    keyListener = debounce((event) => {
        const {isDragging} = this.state;

        // We won't process any events whilst we're sorting
        if (isDragging) return;

        switch (event.key.toLowerCase()) {
            case keyBinds.SKIP: {
                if (this.canForfeit()) {
                    this.skipButtonRef?.current.click();
                }
                break;
            }
            case keyBinds.SORT: {
                this.sortButtonRef?.current.click();
                break;
            }
            default: {
            }
        }
    }, 200);

    /**
     * Method invoked when a state or prop change occurs, check the change in state/props to
     * determine whether the component should re-render or not.
     *
     * @returns {boolean|null} Whether to re-render or not.
     * */
    async handleGameStateUpdate({update, meta = []}) {
        // prevent updates from being applied to table-top or user deck whilst a drag
        // event is occurring. We can attempt to merge the 'state' after the drag update
        // completes gracefully or not. If the state merge fails, we can always ask the
        // server for the game state and update the client with said state.
        if (this.state.isDragging) return null;

        for (const event of meta) {
            // play the place card sound if some one placed a card
            if (event.type === "place" || event.type === "cover") {
                this.props.placeCard();
            }

            if (event.type === "new_round" || event.type === "start") {

                // we want to pause the game for 2 secs to show that the round finished...
                await delay(() => {
                    if (Object.values(event.actors).includes(this.props.lobby.name) && this._isMounted) {
                        this.setState({showAnnouncement: true});
                    }
                }, event.type === "start" ? 0 : 1000);
            }

            // Don't do anything if it's a victory
            if (event.type === "victory") return;
        }

        const tableTop = Object.entries(update.tableTop).map((cards) => {
            return cards.filter(card => card !== null).map((card) => {
                return {value: card, src: process.env.PUBLIC_URL + `/cards/${card}.svg`};
            });
        });

        let deck = update.deck;

        if (update.out && this.state.spectating !== null) {
            const spectatedPlayer = update.players.find(p => p.name === this.state.spectating);

            // Were they booted or kicked, since this cannot happen even if the player resigns!
            if (spectatedPlayer) {
                deck = spectatedPlayer.deck;
            }
        }

        // Let's be intelligent about how we update the cards since we want avoid 2 things:
        //
        //      1). Avoid flickering when re-rendering cards whilst they are the same.
        //
        //      2). Respect the user's order of the cards. A user might re-shuffle their
        //          cards for convenience and therefore we should respect the order instead
        //          of brutishly overwriting it with the server's game state.

        const newDeck = new Set(deck);
        const currentDeck = this.state.game.deck.map((card) => card.value);
        let deckUpdate = this.state.game.deck.concat();


        // avoid even updating cards if the userCards are equal
        if (!arraysEqual(currentDeck, deck)) {

            // take the intersection of the current deck and the updated new deck
            let intersection = new Set([...currentDeck].filter(x => newDeck.has(x)));
            let diff = new Set([...newDeck].filter(x => !intersection.has(x)));

            deckUpdate = [...intersection, ...diff].map((card) => {
                return {value: card, src: process.env.PUBLIC_URL + `/cards/${card}.svg`};
            });
        }

        // We should pad 'tableTop' with arrays up to the 6th index if there arent enough cards on the tableTop.
        for (let index = 0; index < TableSize; index++) {
            if (typeof tableTop[index] === 'undefined') {
                tableTop[index] = [];
            }
        }

        if (this._isMounted) {
            this.setState({
                game: {
                    ...update,
                    tableTop: tableTop,
                    deck: deckUpdate,  // overwrite the card value with a value and an image source...
                },
            });
        }
    }

    /**
     * Method invoked when a state or prop change occurs, check the change in state/props to
     * determine whether the component should re-render or not.
     *
     * @returns {boolean} Whether to re-render or not.
     * */
    shouldComponentUpdate(nextProps, nextState, nextContext) {

        // if game state changes... we should update
        if (!deepEqual(this.state.game, nextState.game)) return true;
        if (!deepEqual(this.props, nextProps)) return true;

        // we should also update if any of the following updates... canPlaceMap and showVictory
        // Essentially we are avoiding a re-render on 'isDragging' or changing.
        return !deepEqual(this.state.canPlaceMap, nextState.canPlaceMap) ||
            this.state.showVictory !== nextState.showVictory ||
            this.state.showAnnouncement !== nextState.showAnnouncement;
    }

    /**
     * Method invoked on component mount, essentially sets up socket event listeners
     * and or propagates a game state if one already exists (passed in from parent).
     * */
    componentDidMount() {
        this._isMounted = true;

        // The user refreshed the page and maybe re-joined
        if (this.props.game !== null && typeof this.props.game !== 'undefined') {
            this.handleGameStateUpdate({update: this.props.game});
        }

        // setup key listener for shortcuts.
        window.addEventListener("keydown", this.keyListener, false);

        // Common event for processing any player actions taken...e
        // should be transferred on the 'started_game' event.
        this.props.socket.on("begin_round", (event) => {
            this.props.beginRound(); // play gong sound
            this.handleGameStateUpdate(event);
        });

        if (this.props.isSpectator) {
            this.props.socket.on(ClientEvents.SPECTATOR_STATE, this.handleGameStateUpdate)
        } else {
            this.props.socket.on(ClientEvents.ACTION, this.handleGameStateUpdate);
            this.props.socket.on(ClientEvents.INVALID_MOVE, this.handleGameStateUpdate);
        }


        this.props.socket.on(ClientEvents.VICTORY, (event) => {
            this.setState({
                showVictory: true,
                playerOrder: event.players,
            })
        });
    }

    /**
     * Method to clean up any resources left by the component when un-mounting. In this case,
     * we're simply removing the key listener since we don't need it anymore
     * */
    componentWillUnmount() {
        window.removeEventListener("keydown", this.keyListener);

        this._isMounted = false;
    }

    /**
     * Helper method to render a particular region on the game board for player avatars. The method
     * uses the AvatarPlayerGrid configuration layout file to distribute the players in the desired
     * order around the game table.
     *
     * @param region {"players-top"|"players-left"|"players-right"|"players-bottom"} The region to construct
     * @return The constructed region
     * */
    renderPlayerRegion(region) {
        const regionOrder = ['players-bottom', 'players-left', 'players-top', 'players-right'];

        const {players, out} = this.state.game;
        const layout = this.props.isSpectator ? SpectatorGridLayout[players.length.toString()] : AvatarGridLayout[players.length.toString()];

        // don't do anything if no players are currently present or the region isn't being used.
        if (players.length === 0 || typeof layout[region] === 'undefined') {
            return null;
        }

        // count the number of items that were inserted in the previous regions
        const offset = regionOrder.slice(0, regionOrder.indexOf(region)).reduce((acc, value) => {
            // Don't add anything to the accumulator if the region isn't being used for the
            // current player count.
            if (!Object.keys(layout).includes(value)) {
                return acc;
            }

            return acc + layout[value];
        }, 0);

        let playerSection = players.slice(offset, offset + layout[region]);

        // if it's the left hand-side, we need to reverse the list since we want the
        // first player to be closest to the current player.
        if (region === "players-left" || region === "players-bottom") playerSection = playerSection.reverse();

        return playerSection.map((player, index) => {
            const avatarUri = this.props.lobby.players.find((p) => p.name === player.name)?.image;

            return <Player {...avatarUri && {avatarUri}} {...player} {...(out && !player.out) && {onClick: this.setSpectator}}
                           key={index}/>
        });
    }

    render() {
        const {socket, chat, lobby, isSpectator, classes} = this.props;
        const {isDragging, showAnnouncement, playerOrder, showVictory} = this.state;

        return (
            <SettingProvider>
                <GameContext.Provider value={this.state.game}>
                    {showAnnouncement && !showVictory && (
                        <Announcement onFinish={() => this.setState({showAnnouncement: false})}/>
                    )}
                    {showVictory && (
                        <VictoryDialog
                            images={Object.fromEntries(this.props.lobby.players.map((entry) => ([entry.name, entry.image])))}
                            socket={socket}
                            name={lobby.name}
                            players={playerOrder}
                        />
                    )}
                    <DragDropContext
                        onDragEnd={this.onDragEnd}
                        onBeforeCapture={this.onBeforeCapture}
                        sensors={[
                            (api) => this.setState({dragApi: api})
                        ]}
                    >
                        <div className={classes.root}>
                            <div className={classes.tableRoot}>
                                <div
                                    {...!isSpectator && {
                                        style: {
                                            gridTemplateRows: "72px 1fr 8fr 40px"
                                        }
                                    }}
                                    className={clsx(styles.GameContainer, classes.content, {
                                    [classes.contentShift]: chat.opened,
                                })}>
                                    <Header className={styles.GameHeader} countdown={lobby.roundTimeout}/>
                                    <div className={clsx(styles.PlayerArea, styles.PlayerTop)}>
                                        {this.renderPlayerRegion("players-top")}
                                    </div>
                                    <div className={clsx(styles.PlayerArea, styles.PlayerLeft)}>
                                        {this.renderPlayerRegion("players-left")}
                                    </div>

                                    <Table
                                        className={styles.GameTable}
                                        placeMap={this.state.canPlaceMap}
                                    />

                                    <div className={clsx(styles.PlayerArea, styles.PlayerRight)}>
                                        {this.renderPlayerRegion("players-right")}
                                    </div>

                                    {!isSpectator ? (
                                        <PlayerActions
                                            className={styles.GameFooter}
                                            sortRef={this.sortButtonRef}
                                            skipRef={this.skipButtonRef}

                                            socket={socket}
                                            isDragging={isDragging}
                                            moveCards={this.moveCards}
                                            canForfeit={this.canForfeit() && !isDragging}
                                            setCards={this.setCards}/>
                                    ) : (
                                        <div className={clsx(styles.PlayerArea, styles.GameFooter)}>
                                            {this.renderPlayerRegion("players-bottom")}
                                        </div>
                                    )}
                                </div>
                                <Chat socket={socket}/>
                            </div>

                            {!isSpectator && <CardHolder/>}
                        </div>
                    </DragDropContext>
                </GameContext.Provider>
            </SettingProvider>
        );
    }
}

Game.propTypes = {
    /* Initial game state if such exists */
    game: PropTypes.object,

    /* Sound */
    beginRound: PropTypes.func,
    placeCard: PropTypes.func,

    pin: PropTypes.string.isRequired,
    lobby: PropTypes.object.isRequired,
    isHost: PropTypes.bool.isRequired,
    socket: PropTypes.object.isRequired,
    chat: PropTypes.object.isRequired,
};

const WithContext = (props) => {
    const chat = useChatState();
    const [beginRound] = useSound(begin, {volume: 0.25});
    const [placeCard] = useSound(place, {volume: 0.25});

    return <Game {...props} chat={chat} beginRound={beginRound} placeCard={placeCard}/>;
}

export default withStyles(chatDrawerStyles, {withTheme: true})(WithContext);
