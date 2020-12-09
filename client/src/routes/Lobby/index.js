/**
 * Module description:   src/routes/Lobby/index.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import React, {useEffect} from "react";
import {useHistory, useParams} from "react-router";

const LobbyRoute = () => {
    const {id} = useParams();
    const history = useHistory();

    // check that the user is authenticated for the current
    // lobby
    useEffect(() => {
        console.log(id);

    }, [id, history])

    return (
        <>
            Lobby
        </>
    );
};

export default LobbyRoute;
