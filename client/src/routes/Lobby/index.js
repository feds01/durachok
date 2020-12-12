/**
 * Module description:   src/routes/Lobby/index.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import React from "react";
import styles from "./index.module.scss";
import {io} from "socket.io-client";
import * as error from "../../error";
import {withRouter} from "react-router";
import Loader from "react-loader-spinner";
import {getAuthTokens} from "../../utils/auth";
import Divider from "@material-ui/core/Divider";
import StarBorderOutlined from "@material-ui/icons/StarBorderOutlined";


class LobbyRoute extends React.Component {
    constructor(props) {
        super(props);

        this.state = {id: null, ws: null, loaded: false, lobby: {}, error: null};
    }

    componentDidMount() {
        const id = this.props.match.params.id;
        const socket = io(`localhost:5000/${id}`, {query: getAuthTokens(), transports: ["websocket"]});

        // client-side
        socket.on("connect", () => {
            socket.emit("join_game", {});
        });

        socket.on("connect_error", err => {

            // ensure that the transmitted 'connection_error' is an
            // error object from the server, then use the connection
            // message string to determine the next action
            if (err instanceof Error) {

                // if the user is not allowed to join this lobby: re-direct the
                // user back to the home page from where they can re-try to
                // join the lobby
                if (err.message === error.AUTHENTICATION_FAILED || err.message === error.NON_EXISTENT_LOBBY) {
                    this.props.history.push("/");
                }

                // if the user is authenticated but they are trying to join a
                // lobby that already has the maximum players or they are currently
                // in a round, the server will return a error.LOBBY_FULL
                if (err.message === error.LOBBY_FULL) {
                    this.setState({error: error.LOBBY_FULL});
                }
            }

            console.log(err instanceof Error); // true
            console.log(err.message); // not authorized
            console.log(err.data); // { content: "Please retry later" }
        });


        // if the client is successfully authenticated and joined the lobby
        // on the server, then we can begin to load the lobby...
        socket.on("joined_game", (message) => {
            // console.log("players: ", message);
            this.setState({
                loaded: true,
                lobby: message
            });
        });

        this.setState({
            ws: socket,
            id: id
        });
    }

    componentWillUnmount() {
    }

    render() {
        const {id, loaded, lobby, ws} = this.state;


        console.log(lobby.players)
        if (!loaded) {
            return (
                <div
                    style={{
                        display: "flex",
                        height: "100%",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    <div>
                        <Loader className={styles.lobbyLoader} type="Bars" color="#FFFFFF" height={80} width={80}/>
                        <b>Joining Lobby...</b>
                    </div>
                </div>
            );
        } else {
            return (
                <div>
                    <h1 className={styles.lobbyTitle}>Lobby {id}</h1>
                    <Divider style={{backgroundColor: "rgba(172, 170, 190, 1)"}}/>
                    <div className={styles.lobbyPlayers}>
                        {
                            lobby.players.map((player, index) => {
                                if (player === lobby.owner) {
                                    return (<div key={index}>{player} <StarBorderOutlined/></div>);
                                } else {
                                    return (<span key={index}>{player}</span>);
                                }
                            })
                        }
                    </div>
                </div>
            );
        }
    }


}

// const LobbyRoute = () => {
//     const {id} = useParams();
//     const history = useHistory();
//
//     // check that the user is authenticated for the current
//     // lobby
//     useEffect(() => {
//         console.log(id);
//
//     }, [id, history])
//
//     return (
//         <>
//             Lobby
//         </>
//     );
// };

export default withRouter(LobbyRoute);
