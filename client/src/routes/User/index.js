/**
 * Module description:   src/routes/Lobby/index.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import styles from "./index.module.scss";
import React, {useEffect, useState} from "react";
import {getAuthHeader, getAuthTokens} from "../../utils/auth";
import {useHistory} from "react-router";
import LoadingScreen from "../../components/LoadingScreen";
import {Divider} from "@material-ui/core";
import GameCard from "../../components/GameCard";

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
                <div className={styles.Dashboard}>
                    <h1>{userData.name}</h1>
                    <Divider/>

                    <div className={styles.Games}>
                        <h2>Active games</h2>
                        {
                            userData.games.map((game) => {
                                return <GameCard {...game} />
                            })
                        }
                        {JSON.stringify(userData.games)}
                    </div>
                </div>
            </>
        );
    }
};

export default UserRoute;
