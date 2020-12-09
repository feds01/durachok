/**
 * Module description:   src/routes/Lobby/index.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import React from "react";
import {io} from "socket.io-client";
import {withRouter} from "react-router";
import {getAuthTokens} from "../../utils/auth";


class LobbyRoute extends React.Component {
    constructor(props) {
        super(props);

        this.state = {id: null, ws: null};
    }

    componentDidMount() {
        const id =  this.props.match.params.id;
        const socket = io(`localhost:5000/${id}`, {query: getAuthTokens(), transports: ["websocket"]});

        // client-side
        socket.on("connect", () => {
            socket.emit("join_game", {});
        });

        socket.on("connect_error", err => {
            console.log(err instanceof Error); // true
            console.log(err.message); // not authorized
            console.log(err.data); // { content: "Please retry later" }
        });

        socket.on("joined_game", (message) => {
            console.log("players: ", message);
        });

        this.setState({
            ws: socket,
            id: id
        })
    }

    componentWillUnmount() {
    }

    render() {
        const {id} = this.state;

        return (
            <div>
                Lobby {id}
            </div>
        );
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
