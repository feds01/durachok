/**
 * Module description:   src/routes/Lobby/index.js
 *
 * Created on 11/09/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

import styles from "./index.module.scss";
import {useHistory} from "react-router";
import React, {useEffect, useState} from "react";
import Divider from "@material-ui/core/Divider";


import GameCard from "../../components/DashboardGameCard";
import GameDialog from "../../components/GameDialog";
import LoadingScreen from "../../components/LoadingScreen";
import {getAuthHeader, getAuthTokens} from "../../utils/auth";
import {RefreshDashboardContext} from "../../contexts/RefreshDashboard";

const UserRoute = () => {
    const history = useHistory();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [refreshData, setRefreshData] = useState(false);
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
    }, [refreshData, history]);


    if (Object.keys(userData).length === 0) {
        return <LoadingScreen><b>Loading...</b></LoadingScreen>
    } else {
        return (
            <RefreshDashboardContext.Provider value={{
                onRefresh: () => {
                    setUserData({});
                    setRefreshData(!refreshData);
                }
            }}>
                <div className={styles.Dashboard}>
                    <h1>{userData.name}</h1>
                    <Divider/>

                    <div className={styles.Actions}>
                        <button onClick={() => setDialogOpen(true)}>
                            Create game
                        </button>
                    </div>

                    <div className={styles.Games}>
                        <h2>Active games</h2>
                        {
                            userData.games.map((game, index) => {
                                return <GameCard key={index} {...game} />
                            })
                        }
                        {userData.games.length === 0 && (
                            <p>No active games.</p>
                        )}
                    </div>
                </div>
                <GameDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
            </RefreshDashboardContext.Provider>
        );
    }
};

export default UserRoute;
