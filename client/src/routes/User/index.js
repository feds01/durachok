/**
 * Module description:   src/routes/Lobby/index.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import React, {useEffect, useState} from "react";
import {getAuthHeader, getAuthTokens} from "../../utils/auth";
import {useHistory} from "react-router";
import LoadingScreen from "../../components/LoadingScreen";

const UserRoute = () => {
    const history = useHistory();

    const [userData, setUserData] = useState({});

    // check if the client has JWT auth tokens that represent
    // a registered user, if they do not, the method will re-direct
    // the client to the login page.
    useEffect(() => {
        const {token, refreshToken} = getAuthTokens();

        // if either the token or refreshToken is null, re-direct the user
        // to the login page.
        if (token === null || refreshToken === null) {
            history.push("/login");
        } else {
            fetch("/api/user", {
                headers: getAuthHeader(),
            }).then(res => res.json())
                .then((res) => {
                    if (res.status) {
                        setUserData(res.data);
                    } else {
                        history.push("/login");
                    }
                });
        }
    }, []);


    if (Object.keys(userData).length === 0) {
        return <LoadingScreen><b>Loading...</b></LoadingScreen>
    } else {
        return (
            <>
                {JSON.stringify(userData)}
            </>
        );
    }
};

export default UserRoute;
